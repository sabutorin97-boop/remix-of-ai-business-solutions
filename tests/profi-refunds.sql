-- Изолированный тест после миграций 001–006.
BEGIN;
DO $test$
DECLARE
  buyer uuid;
  purchase uuid;
BEGIN
  INSERT INTO profi_market.customers(auth_subject) VALUES ('refund-test') RETURNING id INTO buyer;
  INSERT INTO profi_market.orders(customer_id, gross_minor) VALUES (buyer, 10000) RETURNING id INTO purchase;
  INSERT INTO profi_market.payments(order_id, provider, external_id, amount_minor)
    VALUES (purchase, 'manual', 'refund-payment', 10000);
  PERFORM profi_market.settle_verified_payment(purchase, 'manual', 'paid-event', 'refund-payment', 10000);

  IF profi_market.record_verified_refund(purchase, 'manual', 'refund-payment', 'refund-one', 3000)
    IS DISTINCT FROM 'partial' THEN RAISE EXCEPTION 'Частичный возврат не учтён'; END IF;
  IF profi_market.record_verified_refund(purchase, 'manual', 'refund-payment', 'refund-one', 3000)
    IS DISTINCT FROM 'duplicate' THEN RAISE EXCEPTION 'Повтор возврата не распознан'; END IF;
  IF (SELECT status FROM profi_market.fulfillment_jobs WHERE order_id = purchase)
    IS DISTINCT FROM 'pending' THEN RAISE EXCEPTION 'Частичный возврат отменил всю выдачу'; END IF;

  BEGIN
    PERFORM profi_market.record_verified_refund(purchase, 'manual', 'refund-payment', 'refund-one', 4000);
    RAISE EXCEPTION 'Сумма повторного события изменена';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM profi_market.record_verified_refund(purchase, 'manual', 'refund-payment', 'refund-too-large', 7001);
    RAISE EXCEPTION 'Возврат превысил оплату';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  IF profi_market.record_verified_refund(purchase, 'manual', 'refund-payment', 'refund-two', 7000)
    IS DISTINCT FROM 'full' THEN RAISE EXCEPTION 'Полный возврат не учтён'; END IF;
  IF profi_market.record_verified_refund(purchase, 'manual', 'refund-payment', 'refund-two', 7000)
    IS DISTINCT FROM 'duplicate' THEN RAISE EXCEPTION 'Повтор полного возврата не распознан'; END IF;
  IF (SELECT status FROM profi_market.orders WHERE id = purchase) IS DISTINCT FROM 'refunded'
    OR (SELECT status FROM profi_market.payments WHERE order_id = purchase) IS DISTINCT FROM 'refunded'
    OR NOT EXISTS (SELECT FROM profi_market.fulfillment_jobs
        WHERE order_id = purchase AND status = 'failed' AND cancelled_at IS NOT NULL)
    OR (SELECT sum(amount_minor) FROM profi_market.refunds WHERE order_id = purchase) IS DISTINCT FROM 10000
    OR (SELECT count(*) FROM profi_market.refund_reviews r JOIN profi_market.refunds f ON f.id = r.refund_id
        WHERE f.order_id = purchase) <> 2 THEN
    RAISE EXCEPTION 'Не совпали статус, сумма или задачи на сверку';
  END IF;
END;
$test$;
ROLLBACK;
