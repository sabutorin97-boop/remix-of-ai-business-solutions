BEGIN;
DO $test$
DECLARE
  purchase uuid;
  legacy_purchase uuid;
  lease uuid;
  inputs jsonb := '{"reactive-ai":{"brief":{"offer":"Тестовая услуга"}}}';
BEGIN
  INSERT INTO profi_market.customers(auth_subject) VALUES ('prepared-buyer');
  UPDATE profi_market.products SET active = true WHERE sku = 'reactive-ai';
  legacy_purchase := profi_market.create_verified_checkout('prepared-buyer', 'legacy-worker-key', ARRAY['reactive-ai']);
  purchase := profi_market.create_checkout_with_inputs('prepared-buyer', 'prepared-worker-key', ARRAY['reactive-ai'], inputs);
  IF profi_market.create_checkout_with_inputs('prepared-buyer', 'prepared-worker-key', ARRAY['reactive-ai'], inputs)
    IS DISTINCT FROM purchase THEN RAISE EXCEPTION 'Повтор создал другой заказ'; END IF;
  BEGIN
    PERFORM profi_market.create_checkout_with_inputs('prepared-buyer','prepared-worker-key',ARRAY['reactive-ai'],
      '{"reactive-ai":{"brief":{"offer":"Другая услуга"}}}');
    RAISE EXCEPTION 'Сохранённую анкету удалось подменить';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF (SELECT payload FROM profi_market.product_inputs WHERE order_id = purchase)
    IS DISTINCT FROM inputs->'reactive-ai' THEN RAISE EXCEPTION 'Анкета не сохранена'; END IF;
  INSERT INTO profi_market.payments(order_id, provider, external_id, amount_minor)
    VALUES (legacy_purchase,'manual','legacy-worker-pay',249000),(purchase,'manual','prepared-worker-pay',249000);
  PERFORM profi_market.settle_verified_payment(legacy_purchase,'manual','legacy-worker-event','legacy-worker-pay',249000);
  SELECT lease_token INTO lease FROM profi_market.claim_prepared_fulfillment_job();
  IF lease IS NOT NULL THEN RAISE EXCEPTION 'Старый заказ попал в очередь анкет'; END IF;
  PERFORM profi_market.settle_verified_payment(purchase,'manual','prepared-worker-event','prepared-worker-pay',249000);
  SELECT lease_token INTO lease FROM profi_market.claim_prepared_fulfillment_job() WHERE order_id = purchase;
  IF lease IS NULL THEN RAISE EXCEPTION 'Оплаченный заказ с анкетой не выдан обработчику'; END IF;
END;
$test$;
ROLLBACK;
