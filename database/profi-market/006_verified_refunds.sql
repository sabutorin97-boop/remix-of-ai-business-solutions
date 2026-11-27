-- Черновик учёта подтверждённых возвратов. Вызов не обращается к платёжному провайдеру.
BEGIN;

ALTER TABLE profi_market.fulfillment_jobs ADD COLUMN cancelled_at timestamptz;

CREATE TABLE profi_market.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES profi_market.orders,
  payment_id uuid NOT NULL REFERENCES profi_market.payments,
  provider text NOT NULL,
  external_id text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);
CREATE INDEX refunds_payment_idx ON profi_market.refunds(payment_id);

CREATE TABLE profi_market.refund_reviews (
  refund_id uuid PRIMARY KEY REFERENCES profi_market.refunds,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE FUNCTION profi_market.record_verified_refund(
  order_key uuid,
  payment_provider text,
  external_payment_key text,
  external_refund_key text,
  refund_minor bigint
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog
AS $refund$
DECLARE
  purchase profi_market.orders%ROWTYPE;
  payment profi_market.payments%ROWTYPE;
  prior profi_market.refunds%ROWTYPE;
  recorded_minor numeric;
  new_refund uuid;
  full_refund boolean;
BEGIN
  IF order_key IS NULL OR payment_provider IS NULL OR refund_minor IS NULL OR refund_minor <= 0
    OR external_payment_key IS NULL OR length(trim(external_payment_key)) NOT BETWEEN 1 AND 200
    OR external_refund_key IS NULL OR length(trim(external_refund_key)) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Недопустимые параметры возврата' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Тот же порядок блокировок, что у подтверждения оплаты.
  SELECT * INTO purchase FROM profi_market.orders WHERE id = order_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Заказ не найден' USING ERRCODE = 'invalid_parameter_value'; END IF;

  SELECT * INTO payment FROM profi_market.payments
    WHERE order_id = order_key AND provider = payment_provider AND external_id = external_payment_key
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Оплата не найдена' USING ERRCODE = 'invalid_parameter_value'; END IF;

  SELECT * INTO prior FROM profi_market.refunds
    WHERE provider = payment_provider AND external_id = external_refund_key;
  IF FOUND THEN
    IF prior.payment_id = payment.id AND prior.amount_minor = refund_minor THEN RETURN 'duplicate'; END IF;
    RAISE EXCEPTION 'Идентификатор возврата уже используется' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF purchase.status <> 'paid' OR payment.status <> 'paid' THEN
    RAISE EXCEPTION 'Возврат возможен только по оплаченной операции' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT coalesce(sum(amount_minor), 0) INTO recorded_minor FROM profi_market.refunds WHERE payment_id = payment.id;
  IF recorded_minor + refund_minor > payment.amount_minor THEN
    RAISE EXCEPTION 'Возвраты превышают сумму оплаты' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  full_refund := recorded_minor + refund_minor = payment.amount_minor;

  INSERT INTO profi_market.refunds(order_id, payment_id, provider, external_id, amount_minor)
    VALUES (order_key, payment.id, payment_provider, external_refund_key, refund_minor)
    RETURNING id INTO new_refund;
  INSERT INTO profi_market.refund_reviews(refund_id) VALUES (new_refund);

  IF full_refund THEN
    UPDATE profi_market.payments SET status = 'refunded' WHERE id = payment.id;
    UPDATE profi_market.orders SET status = 'refunded' WHERE id = purchase.id;
    UPDATE profi_market.fulfillment_jobs SET status = 'failed', cancelled_at = now()
      WHERE order_id = order_key AND status = 'pending';
    RETURN 'full';
  END IF;
  RETURN 'partial';
END;
$refund$;

REVOKE ALL ON TABLE profi_market.refunds, profi_market.refund_reviews FROM PUBLIC;
REVOKE ALL ON FUNCTION profi_market.record_verified_refund(uuid, text, text, text, bigint) FROM PUBLIC;
COMMIT;
