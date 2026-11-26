-- Тестовая миграция. Вызывать только после серверной проверки полной оплаты.
BEGIN;

CREATE TABLE profi_market.fulfillment_jobs (
  order_id uuid PRIMARY KEY REFERENCES profi_market.orders,
  payment_id uuid NOT NULL UNIQUE REFERENCES profi_market.payments,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE profi_market.fulfillment_jobs FROM PUBLIC;

CREATE FUNCTION profi_market.settle_verified_payment(
  order_key uuid,
  payment_provider text,
  event_key text,
  external_payment_key text,
  paid_minor bigint
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog
AS $settle$
DECLARE
  purchase profi_market.orders%ROWTYPE;
  payment profi_market.payments%ROWTYPE;
  known_payment_id uuid;
BEGIN
  IF order_key IS NULL OR payment_provider IS NULL OR paid_minor IS NULL OR paid_minor <= 0
    OR event_key IS NULL OR length(trim(event_key)) NOT BETWEEN 1 AND 200
    OR external_payment_key IS NULL OR length(trim(external_payment_key)) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Недопустимые параметры подтверждения оплаты' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Все операции оплаты одного заказа получают блокировку в одном порядке.
  SELECT * INTO purchase FROM profi_market.orders WHERE id = order_key FOR UPDATE;
  IF NOT FOUND OR purchase.payable_minor <> paid_minor THEN
    RAISE EXCEPTION 'Заказ или сумма оплаты не совпадает' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO payment FROM profi_market.payments
    WHERE order_id = order_key AND provider = payment_provider AND external_id = external_payment_key
    FOR UPDATE;
  IF NOT FOUND OR payment.amount_minor <> paid_minor THEN
    RAISE EXCEPTION 'Ожидаемый платёж не найден или сумма не совпадает' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT payment_id INTO known_payment_id FROM profi_market.payment_events
    WHERE provider = payment_provider AND event_id = event_key;
  IF FOUND THEN
    IF known_payment_id = payment.id THEN RETURN 'duplicate'; END IF;
    RAISE EXCEPTION 'Уведомление уже связано с другим платежом' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF purchase.status <> 'pending' OR payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Заказ и платёж должны ожидать оплаты' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO profi_market.payment_events(provider, event_id, payment_id)
    VALUES (payment_provider, event_key, payment.id);
  UPDATE profi_market.payments SET status = 'paid' WHERE id = payment.id;
  UPDATE profi_market.orders SET status = 'paid', paid_at = now() WHERE id = purchase.id;
  INSERT INTO profi_market.fulfillment_jobs(order_id, payment_id) VALUES (purchase.id, payment.id);
  RETURN 'settled';
END;
$settle$;

REVOKE ALL ON FUNCTION profi_market.settle_verified_payment(uuid, text, text, text, bigint) FROM PUBLIC;
COMMIT;
