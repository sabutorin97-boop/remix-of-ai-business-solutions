BEGIN;

CREATE TABLE profi_market.product_inputs (
  order_id uuid NOT NULL,
  sku text NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  PRIMARY KEY (order_id, sku),
  FOREIGN KEY (order_id, sku) REFERENCES profi_market.order_items(order_id, sku)
);

CREATE FUNCTION profi_market.create_checkout_with_inputs(
  authenticated_subject text, request_key text, requested_skus text[], inputs jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $checkout$
DECLARE
  purchase_id uuid;
  purchase_status text;
  stored_inputs jsonb;
  input_skus text[];
BEGIN
  IF inputs IS NULL OR jsonb_typeof(inputs) <> 'object' OR octet_length(inputs::text) > 147456 THEN
    RAISE EXCEPTION 'Некорректный пакет анкет' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT array_agg(key ORDER BY key) INTO input_skus FROM jsonb_each(inputs);
  IF input_skus IS NULL OR input_skus IS DISTINCT FROM ARRAY(
    SELECT sku FROM unnest(requested_skus) AS selected(sku) ORDER BY sku
  ) OR EXISTS (
    SELECT FROM jsonb_each(inputs)
    WHERE key NOT IN ('reactive-ai', 'ai-radar') OR jsonb_typeof(value) <> 'object'
  ) THEN
    RAISE EXCEPTION 'Анкеты должны совпадать с товарами заказа' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  purchase_id := profi_market.create_verified_checkout(authenticated_subject, request_key, requested_skus);
  SELECT status INTO purchase_status FROM profi_market.orders WHERE id = purchase_id FOR UPDATE;
  SELECT jsonb_object_agg(sku, payload) INTO stored_inputs
    FROM profi_market.product_inputs WHERE order_id = purchase_id;
  IF stored_inputs = inputs THEN RETURN purchase_id; END IF;
  IF stored_inputs IS NOT NULL OR purchase_status <> 'pending' THEN
    RAISE EXCEPTION 'Анкеты заказа уже зафиксированы' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO profi_market.product_inputs(order_id, sku, payload)
    SELECT purchase_id, key, value FROM jsonb_each(inputs);
  RETURN purchase_id;
END;
$checkout$;

CREATE FUNCTION profi_market.claim_prepared_fulfillment_job()
RETURNS TABLE(order_id uuid, lease_token uuid) LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog AS $claim$
DECLARE
  purchase_key uuid;
  purchase_status text;
  job_attempts smallint;
BEGIN
  SELECT purchase.id, purchase.status, job.attempts INTO purchase_key, purchase_status, job_attempts
  FROM profi_market.fulfillment_jobs AS job
  JOIN profi_market.orders AS purchase ON purchase.id = job.order_id
  WHERE purchase.status IN ('paid', 'refunded') AND job.cancelled_at IS NULL AND job.available_at <= now()
    AND (job.status = 'pending'
      OR (job.status = 'processing' AND coalesce(job.lease_expires_at, '-infinity') <= now()))
    AND EXISTS (SELECT FROM profi_market.product_inputs AS input WHERE input.order_id = purchase.id)
  ORDER BY job.available_at, job.created_at, job.order_id
  LIMIT 1 FOR UPDATE OF purchase SKIP LOCKED;
  IF NOT FOUND THEN RETURN; END IF;

  IF purchase_status = 'refunded' OR job_attempts >= 5 THEN
    UPDATE profi_market.fulfillment_jobs AS job SET status = 'failed',
      cancelled_at = CASE WHEN purchase_status = 'refunded' THEN now() ELSE NULL END,
      lease_token = NULL, lease_expires_at = NULL
      WHERE job.order_id = purchase_key;
    RETURN;
  END IF;

  RETURN QUERY UPDATE profi_market.fulfillment_jobs AS job SET status = 'processing',
    attempts = job.attempts + 1, lease_token = gen_random_uuid(), lease_expires_at = now() + interval '5 minutes'
    WHERE job.order_id = purchase_key RETURNING job.order_id, job.lease_token;
END;
$claim$;

REVOKE ALL ON FUNCTION profi_market.claim_prepared_fulfillment_job() FROM PUBLIC;
REVOKE ALL ON TABLE profi_market.product_inputs FROM PUBLIC;
REVOKE ALL ON FUNCTION profi_market.create_checkout_with_inputs(text, text, text[], jsonb) FROM PUBLIC;
COMMIT;
