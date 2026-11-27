BEGIN;

CREATE TABLE profi_market.verified_customer_emails (
  email text PRIMARY KEY CHECK (email = lower(trim(email)) AND length(email) BETWEEN 3 AND 254),
  customer_id uuid NOT NULL UNIQUE REFERENCES profi_market.customers(id),
  verified_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profi_market.email_code_challenges (
  email text PRIMARY KEY REFERENCES profi_market.verified_customer_emails(email) ON DELETE CASCADE,
  id uuid NOT NULL UNIQUE,
  digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  attempts_left smallint NOT NULL CHECK (attempts_left BETWEEN 0 AND 5),
  consumed_at timestamptz
);

CREATE FUNCTION profi_market.save_email_code(address text, challenge uuid, code_digest text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog AS $$
  WITH saved AS (
    INSERT INTO profi_market.email_code_challenges AS existing
      (email, id, digest, expires_at, attempts_left)
    SELECT email, challenge, code_digest, now() + interval '10 minutes', 5
    FROM profi_market.verified_customer_emails WHERE email = address
    ON CONFLICT (email) DO UPDATE SET id = excluded.id, digest = excluded.digest,
      created_at = excluded.created_at, expires_at = excluded.expires_at,
      attempts_left = excluded.attempts_left, consumed_at = NULL
    WHERE existing.created_at <= now() - interval '60 seconds'
    RETURNING id
  )
  SELECT EXISTS (SELECT FROM saved);
$$;

CREATE FUNCTION profi_market.consume_email_code(challenge uuid, code_digest text)
RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog AS $$
  WITH attempt AS (
    UPDATE profi_market.email_code_challenges
    SET attempts_left = attempts_left - 1,
      consumed_at = CASE WHEN digest = code_digest THEN now() ELSE NULL END
    WHERE id = challenge AND expires_at > now() AND consumed_at IS NULL AND attempts_left > 0
    RETURNING email, consumed_at
  )
  SELECT customers.auth_subject FROM attempt
  JOIN profi_market.verified_customer_emails USING (email)
  JOIN profi_market.customers ON customers.id = verified_customer_emails.customer_id
  WHERE attempt.consumed_at IS NOT NULL;
$$;

REVOKE ALL ON TABLE profi_market.verified_customer_emails, profi_market.email_code_challenges FROM PUBLIC;
REVOKE ALL ON FUNCTION profi_market.save_email_code(text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION profi_market.consume_email_code(uuid, text) FROM PUBLIC;
COMMIT;
