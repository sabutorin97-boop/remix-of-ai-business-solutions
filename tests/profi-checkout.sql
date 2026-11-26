-- Запускать только в отдельной тестовой базе после 001–003.
BEGIN;
DO $test$
DECLARE
  purchase uuid;
  repeated uuid;
BEGIN
  INSERT INTO profi_market.customers(auth_subject) VALUES ('checkout-test');
  BEGIN
    PERFORM profi_market.create_verified_checkout('checkout-test', 'inactive-key', ARRAY['reactive-ai']);
    RAISE EXCEPTION 'Неактивный продукт принят';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  UPDATE profi_market.products SET active = true WHERE sku IN ('reactive-ai', 'ai-radar');
  purchase := profi_market.create_verified_checkout('checkout-test', 'request-001', ARRAY['reactive-ai']);

  UPDATE profi_market.products SET price_minor = 399000 WHERE sku = 'reactive-ai';
  repeated := profi_market.create_verified_checkout('checkout-test', 'request-001', ARRAY['reactive-ai']);
  IF purchase IS NULL OR purchase IS DISTINCT FROM repeated
    OR (SELECT gross_minor FROM profi_market.orders WHERE id = purchase) <> 249000
    OR (SELECT unit_minor FROM profi_market.order_items WHERE order_id = purchase AND sku = 'reactive-ai') <> 249000
    OR (SELECT count(*) FROM profi_market.orders WHERE checkout_key = 'request-001') <> 1 THEN
    RAISE EXCEPTION 'Повтор должен вернуть один заказ с исходной ценой';
  END IF;

  BEGIN
    PERFORM profi_market.create_verified_checkout('checkout-test', 'request-001', ARRAY['ai-radar']);
    RAISE EXCEPTION 'Ключ повтора позволил заменить товар';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  BEGIN
    PERFORM profi_market.create_verified_checkout('unknown-customer', 'request-002', ARRAY['reactive-ai']);
    RAISE EXCEPTION 'Неизвестный покупатель принят';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
END;
$test$;
ROLLBACK;
