BEGIN;
DO $test$
DECLARE
  buyer uuid;
  purchase uuid;
  first_lease uuid;
  next_lease uuid;
  event_count int;
BEGIN
  INSERT INTO profi_market.customers(auth_subject) VALUES ('queue-test') RETURNING id INTO buyer;
  INSERT INTO profi_market.orders(customer_id, gross_minor) VALUES (buyer, 10000) RETURNING id INTO purchase;
  INSERT INTO profi_market.payments(order_id, provider, external_id, amount_minor)
    VALUES (purchase, 'manual', 'queue-payment', 10000);
  PERFORM profi_market.settle_verified_payment(purchase, 'manual', 'queue-event', 'queue-payment', 10000);
  SELECT lease_token INTO first_lease FROM profi_market.claim_fulfillment_job() WHERE order_id = purchase;
  IF first_lease IS NULL THEN RAISE EXCEPTION 'Оплаченный заказ не выдан обработчику'; END IF;
  SELECT count(*) INTO event_count FROM profi_market.claim_fulfillment_job();
  IF event_count <> 0 THEN RAISE EXCEPTION 'Задание выдано повторно при действующей аренде'; END IF;

  UPDATE profi_market.fulfillment_jobs SET lease_expires_at = now() - interval '1 second' WHERE order_id = purchase;
  SELECT lease_token INTO next_lease FROM profi_market.claim_fulfillment_job() WHERE order_id = purchase;
  IF next_lease IS NULL OR next_lease = first_lease THEN RAISE EXCEPTION 'Не выдана новая аренда'; END IF;
  IF profi_market.finish_fulfillment_job(purchase, first_lease, true) THEN
    RAISE EXCEPTION 'Просроченный обработчик подтвердил задание';
  END IF;

  PERFORM profi_market.record_verified_refund(purchase, 'manual', 'queue-payment', 'queue-refund', 10000);
  IF profi_market.finish_fulfillment_job(purchase, next_lease, true) THEN
    RAISE EXCEPTION 'Выдача подтверждена после полного возврата';
  END IF;
  IF NOT EXISTS (SELECT FROM profi_market.fulfillment_jobs
      WHERE order_id = purchase AND status = 'failed' AND cancelled_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Возврат не остановил выдачу';
  END IF;

  INSERT INTO profi_market.orders(customer_id, gross_minor) VALUES (buyer, 10000) RETURNING id INTO purchase;
  INSERT INTO profi_market.payments(order_id, provider, external_id, amount_minor)
    VALUES (purchase, 'manual', 'queue-retry-payment', 10000);
  PERFORM profi_market.settle_verified_payment(purchase, 'manual', 'queue-retry-event', 'queue-retry-payment', 10000);
  SELECT lease_token INTO first_lease FROM profi_market.claim_fulfillment_job() WHERE order_id = purchase;
  IF NOT profi_market.finish_fulfillment_job(purchase, first_lease, false) THEN
    RAISE EXCEPTION 'Сбой не зафиксирован';
  END IF;
  SELECT count(*) INTO event_count FROM profi_market.claim_fulfillment_job();
  IF event_count <> 0 THEN RAISE EXCEPTION 'Очередь не дождалась повторной попытки'; END IF;
  UPDATE profi_market.fulfillment_jobs SET available_at = now() WHERE order_id = purchase;
  SELECT lease_token INTO next_lease FROM profi_market.claim_fulfillment_job() WHERE order_id = purchase;
  IF next_lease IS NULL OR NOT profi_market.finish_fulfillment_job(purchase, next_lease, true) THEN
    RAISE EXCEPTION 'Повтор не завершил задачу';
  END IF;
  IF NOT EXISTS (SELECT FROM profi_market.fulfillment_jobs WHERE order_id = purchase AND status = 'done' AND attempts = 2) THEN
    RAISE EXCEPTION 'Состояние после повтора не зафиксировано';
  END IF;
END;
$test$;
ROLLBACK;
