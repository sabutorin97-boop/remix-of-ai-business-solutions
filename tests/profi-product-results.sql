BEGIN;
DO $test$
DECLARE
  purchase uuid;
  lease uuid;
  count_rows int;
BEGIN
  INSERT INTO profi_market.customers(auth_subject) VALUES ('result-owner'), ('result-other');
  UPDATE profi_market.products SET active = true WHERE sku IN ('reactive-ai', 'ai-radar');
  purchase := profi_market.create_verified_checkout('result-owner', 'result-order-key', ARRAY['reactive-ai','ai-radar']);
  INSERT INTO profi_market.payments(order_id, provider, external_id, amount_minor)
    VALUES (purchase, 'manual', 'result-payment', 548000);
  PERFORM profi_market.settle_verified_payment(purchase, 'manual', 'result-paid', 'result-payment', 548000);
  SELECT lease_token INTO lease FROM profi_market.claim_fulfillment_job() WHERE order_id = purchase;
  SELECT count(*) INTO count_rows FROM profi_market.read_paid_product_results('result-owner', purchase);
  IF count_rows <> 0 THEN RAISE EXCEPTION 'Результаты видны до завершения'; END IF;

  BEGIN
    PERFORM profi_market.store_fulfillment_results(purchase, lease, '[{"sku":"reactive-ai","payload":{"type":"demo"}}]');
    RAISE EXCEPTION 'Сохранена неполная выдача';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF NOT profi_market.store_fulfillment_results(purchase, lease,
    '[{"sku":"reactive-ai","payload":{"text":"Тестовый комплект"}},{"sku":"ai-radar","payload":{"text":"Тестовые наблюдения"}}]') THEN
    RAISE EXCEPTION 'Результаты не сохранены';
  END IF;
  SELECT count(*) INTO count_rows FROM profi_market.read_paid_product_results('result-owner', purchase);
  IF count_rows <> 2 THEN RAISE EXCEPTION 'Покупатель не увидел два результата'; END IF;
  SELECT count(*) INTO count_rows FROM profi_market.read_paid_product_results('result-other', purchase);
  IF count_rows <> 0 THEN RAISE EXCEPTION 'Чужой покупатель получил результаты'; END IF;

  PERFORM profi_market.record_verified_refund(purchase, 'manual', 'result-payment', 'result-refund', 548000);
  SELECT count(*) INTO count_rows FROM profi_market.read_paid_product_results('result-owner', purchase);
  IF count_rows <> 0 THEN RAISE EXCEPTION 'Доступ остался после полного возврата'; END IF;
END;
$test$;
ROLLBACK;
