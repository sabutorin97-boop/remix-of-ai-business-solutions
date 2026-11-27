-- Приватное хранение результатов, выданных по подтверждённому заказу.
BEGIN;

CREATE TABLE profi_market.product_results (
  order_id uuid NOT NULL,
  sku text NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, sku),
  FOREIGN KEY (order_id, sku) REFERENCES profi_market.order_items(order_id, sku)
);

CREATE FUNCTION profi_market.store_fulfillment_results(order_key uuid, current_lease uuid, results jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $store$
DECLARE
  requested_skus text[];
  supplied_skus text[];
BEGIN
  IF results IS NULL OR jsonb_typeof(results) <> 'array' OR octet_length(results::text) > 262144 THEN
    RAISE EXCEPTION 'Некорректный пакет результатов' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF jsonb_array_length(results) NOT BETWEEN 1 AND 5 OR EXISTS (
    SELECT FROM jsonb_array_elements(results) AS item
    WHERE jsonb_typeof(item->'sku') IS DISTINCT FROM 'string'
      OR jsonb_typeof(item->'payload') IS DISTINCT FROM 'object'
  ) THEN
    RAISE EXCEPTION 'Некорректный набор результатов' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT array_agg(sku ORDER BY sku) INTO requested_skus
    FROM profi_market.order_items WHERE order_id = order_key;
  SELECT array_agg(item->>'sku' ORDER BY item->>'sku') INTO supplied_skus
    FROM jsonb_array_elements(results) AS item;
  IF requested_skus IS DISTINCT FROM supplied_skus THEN
    RAISE EXCEPTION 'Результаты не совпадают с составом заказа' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Завершение задания и сохранение комплекта идут в одной транзакции.
  IF NOT profi_market.finish_fulfillment_job(order_key, current_lease, true) THEN RETURN false; END IF;
  INSERT INTO profi_market.product_results(order_id, sku, payload)
    SELECT order_key, item->>'sku', item->'payload' FROM jsonb_array_elements(results) AS item;
  RETURN true;
END;
$store$;

CREATE FUNCTION profi_market.read_paid_product_results(authenticated_subject text, order_key uuid)
RETURNS TABLE(sku text, payload jsonb) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $read$
  SELECT result.sku, result.payload FROM profi_market.product_results AS result
  JOIN profi_market.orders AS purchase ON purchase.id = result.order_id
  JOIN profi_market.customers AS buyer ON buyer.id = purchase.customer_id
  WHERE result.order_id = order_key AND buyer.auth_subject = authenticated_subject
    AND purchase.status = 'paid'
  ORDER BY result.sku;
$read$;

REVOKE ALL ON TABLE profi_market.product_results FROM PUBLIC;
REVOKE ALL ON FUNCTION profi_market.store_fulfillment_results(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION profi_market.read_paid_product_results(text, uuid) FROM PUBLIC;
COMMIT;
