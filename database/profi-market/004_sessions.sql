BEGIN;

CREATE TABLE profi_market.sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  customer_id uuid NOT NULL REFERENCES profi_market.customers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL CHECK (expires_at > created_at),
  revoked_at timestamptz
);

REVOKE ALL ON TABLE profi_market.sessions FROM PUBLIC;
COMMIT;
