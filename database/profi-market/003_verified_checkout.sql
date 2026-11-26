-- Черновик. authenticated_subject передаёт сервер после проверки сессии.
BEGIN;

ALTER TABLE profi_market.orders
  ADD COLUMN checkout_key text,
  ADD CONSTRAINT orders_checkout_customer_key UNIQUE (customer_id, checkout_key);

CREATE FUNCTION profi_market.create_verified_checkout(
  authenticated_subject text,
  request_key text,
  requested_skus text[]
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog
AS $checkout$
DECLARE
  buyer_id uuid;
  purchase_id uuid;
  sorted_requested text[];
  existing_skus text[];
  snapshot jsonb;
  total_minor bigint;
BEGIN
  IF authenticated_subject IS NULL OR length(trim(authenticated_subject)) = 0
    OR request_key IS NULL OR request_key !~ '^[A-Za-z0-9_-]{8,128}$'
    OR requested_skus IS NULL OR cardinality(requested_skus) NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Некорректные параметры заказа' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT array_agg(DISTINCT sku ORDER BY sku) INTO sorted_requested
    FROM unnest(requested_skus) AS input(sku) WHERE sku IS NOT NULL AND sku <> '';
  IF sorted_requested IS NULL OR cardinality(sorted_requested) <> cardinality(requested_skus) THEN
    RAISE EXCEPTION 'Коды товаров должны быть заполнены и уникальны' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Блокировка покупателя сериализует повторы запроса для одной учётной записи.
  SELECT id INTO buyer_id FROM profi_market.customers
    WHERE auth_subject = authenticated_subject FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Покупатель не найден' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT id INTO purchase_id FROM profi_market.orders
    WHERE customer_id = buyer_id AND checkout_key = request_key;
  IF FOUND THEN
    SELECT array_agg(sku ORDER BY sku) INTO existing_skus FROM profi_market.order_items
      WHERE order_id = purchase_id;
    IF existing_skus IS DISTINCT FROM sorted_requested THEN
      RAISE EXCEPTION 'Ключ уже использован для другого состава заказа' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    RETURN purchase_id;
  END IF;

  SELECT jsonb_agg(to_jsonb(product)), sum(price_minor) INTO snapshot, total_minor
    FROM (
      SELECT sku, name, price_minor FROM profi_market.products
        WHERE active AND sku = ANY (sorted_requested)
    ) AS product;
  IF snapshot IS NULL OR jsonb_array_length(snapshot) <> cardinality(sorted_requested) THEN
    RAISE EXCEPTION 'В заказе есть недоступные товары' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO profi_market.orders(customer_id, checkout_key, gross_minor)
    VALUES (buyer_id, request_key, total_minor) RETURNING id INTO purchase_id;
  INSERT INTO profi_market.order_items(order_id, sku, name_snapshot, quantity, unit_minor)
    SELECT purchase_id, sku, name, 1, price_minor
      FROM jsonb_to_recordset(snapshot) AS item(sku text, name text, price_minor bigint);
  RETURN purchase_id;
END;
$checkout$;

REVOKE ALL ON FUNCTION profi_market.create_verified_checkout(text, text, text[]) FROM PUBLIC;
COMMIT;
