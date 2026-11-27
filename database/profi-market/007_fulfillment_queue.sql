-- Внутренняя очередь. Здесь нет вызовов GitHub, AI или других внешних сервисов.
BEGIN;

ALTER TABLE profi_market.fulfillment_jobs
  ADD COLUMN attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  ADD COLUMN available_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN lease_token uuid,
  ADD COLUMN lease_expires_at timestamptz;

CREATE INDEX fulfillment_jobs_available_idx ON profi_market.fulfillment_jobs(available_at, created_at)
  WHERE status IN ('pending', 'processing') AND cancelled_at IS NULL;

CREATE FUNCTION profi_market.claim_fulfillment_job()
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

CREATE FUNCTION profi_market.finish_fulfillment_job(order_key uuid, current_lease uuid, succeeded boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $finish$
DECLARE
  purchase_status text;
BEGIN
  IF current_lease IS NULL OR succeeded IS NULL THEN RETURN false; END IF;
  SELECT status INTO purchase_status FROM profi_market.orders WHERE id = order_key FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE profi_market.fulfillment_jobs SET
    status = CASE WHEN purchase_status <> 'paid' THEN 'failed'
      WHEN succeeded THEN 'done' WHEN attempts < 5 THEN 'pending' ELSE 'failed' END,
    cancelled_at = CASE WHEN purchase_status = 'refunded' THEN now() ELSE NULL END,
    available_at = CASE WHEN NOT succeeded THEN now() + interval '30 seconds' ELSE available_at END,
    lease_token = NULL, lease_expires_at = NULL
  WHERE order_id = order_key AND status = 'processing' AND cancelled_at IS NULL
    AND lease_token = current_lease AND lease_expires_at > now();
  RETURN FOUND AND purchase_status = 'paid';
END;
$finish$;

REVOKE ALL ON FUNCTION profi_market.claim_fulfillment_job() FROM PUBLIC;
REVOKE ALL ON FUNCTION profi_market.finish_fulfillment_job(uuid, uuid, boolean) FROM PUBLIC;
COMMIT;
