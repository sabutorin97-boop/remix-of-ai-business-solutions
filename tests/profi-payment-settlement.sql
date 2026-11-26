-- Запускать в отдельной тестовой базе после 001_draft.sql и 002_payment_settlement.sql.
BEGIN;

DO $test$
DECLARE
  customer uuid;
  purchase uuid;
  result text;
BEGIN
  INSERT INTO profi_market.customers(auth_subject) VALUES ('settlement-test') RETURNING id INTO customer;
  INSERT INTO profi_market.orders(customer_id, gross_minor) VALUES (customer, 249000) RETURNING id INTO purchase;
  INSERT INTO profi_market.payments(order_id, provider, external_id, amount_minor)
    VALUES (purchase, 'manual', 'test-payment', 249000);

  BEGIN
    PERFORM profi_market.settle_verified_payment(purchase, 'manual', 'invalid', 'test-payment', 100);
    RAISE EXCEPTION 'Неверная сумма принята';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF (SELECT status FROM profi_market.orders WHERE id = purchase) <> 'pending' THEN
    RAISE EXCEPTION 'Заказ изменён после отклонённой оплаты';
  END IF;

  result := profi_market.settle_verified_payment(purchase, 'manual', 'test-event', 'test-payment', 249000);
  IF result IS DISTINCT FROM 'settled' THEN RAISE EXCEPTION 'Оплата не проведена'; END IF;

  result := profi_market.settle_verified_payment(purchase, 'manual', 'test-event', 'test-payment', 249000);
  IF result IS DISTINCT FROM 'duplicate' THEN RAISE EXCEPTION 'Повтор не распознан'; END IF;

  IF (SELECT count(*) FROM profi_market.fulfillment_jobs WHERE order_id = purchase) <> 1
    OR (SELECT count(*) FROM profi_market.payment_events WHERE event_id = 'test-event') <> 1
    OR (SELECT status FROM profi_market.orders WHERE id = purchase) <> 'paid'
    OR (SELECT status FROM profi_market.payments WHERE order_id = purchase) <> 'paid' THEN
    RAISE EXCEPTION 'Оплата, событие и задача выдачи должны фиксироваться вместе';
  END IF;
END;
$test$;

ROLLBACK;
