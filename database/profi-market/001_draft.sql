-- Draft PostgreSQL schema, not applied. Dedicated schema, no public access.
BEGIN;
CREATE SCHEMA IF NOT EXISTS profi_market;
REVOKE ALL ON SCHEMA profi_market FROM PUBLIC;
CREATE TABLE profi_market.customers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 auth_subject text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE profi_market.products (
 sku text PRIMARY KEY, name text NOT NULL, price_minor bigint NOT NULL CHECK(price_minor > 0),
 active boolean NOT NULL DEFAULT false,
 bonus_bps integer NOT NULL DEFAULT 0 CHECK(bonus_bps BETWEEN 0 AND 1000),
 partner_bps integer NOT NULL DEFAULT 0 CHECK(partner_bps BETWEEN 0 AND 1500)
);
INSERT INTO profi_market.products(sku,name,price_minor) VALUES
 ('reactive-ai','РеАктив AI',249000),('ai-radar','AI-Радар',299000),
 ('employee-lite','Нейросотрудник Lite',199000),('content-factory','Контент-фабрика',199000),
 ('product48','Инфопродукт 48',299000);
CREATE TABLE profi_market.partners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL UNIQUE REFERENCES profi_market.customers,
 code text NOT NULL UNIQUE CHECK(code ~ '^[A-Za-z0-9_-]{8,64}$'),
 mode text NOT NULL CHECK(mode IN ('bonus','cash')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','blocked'))
);
CREATE TABLE profi_market.referrals (
 customer_id uuid PRIMARY KEY REFERENCES profi_market.customers,
 partner_id uuid NOT NULL REFERENCES profi_market.partners,
 attributed_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 CHECK(expires_at > attributed_at)
);
CREATE TABLE profi_market.orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES profi_market.customers,
 partner_id uuid REFERENCES profi_market.partners,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','cancelled','refunded')),
 currency text NOT NULL DEFAULT 'RUB' CHECK(currency='RUB'),
 gross_minor bigint NOT NULL CHECK(gross_minor > 0),
 discount_minor bigint NOT NULL DEFAULT 0 CHECK(discount_minor >= 0 AND discount_minor < gross_minor),
 payable_minor bigint GENERATED ALWAYS AS (gross_minor-discount_minor) STORED,
 bonus_reward_minor bigint NOT NULL DEFAULT 0 CHECK(bonus_reward_minor >= 0),
 partner_reward_minor bigint NOT NULL DEFAULT 0 CHECK(partner_reward_minor >= 0),
 created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz
);
CREATE TABLE profi_market.order_items (
 order_id uuid NOT NULL REFERENCES profi_market.orders,
 sku text NOT NULL, name_snapshot text NOT NULL,
 quantity integer NOT NULL CHECK(quantity>0), unit_minor bigint NOT NULL CHECK(unit_minor>0),
 PRIMARY KEY(order_id,sku)
);
CREATE TABLE profi_market.payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES profi_market.orders,
 provider text NOT NULL CHECK(provider IN ('monecle','manual','lava')),
 external_id text, amount_minor bigint NOT NULL CHECK(amount_minor>0),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed','refunded')),
 UNIQUE(provider,external_id)
);
CREATE UNIQUE INDEX one_paid_payment ON profi_market.payments(order_id) WHERE status='paid';
CREATE TABLE profi_market.payment_events (
 provider text NOT NULL, event_id text NOT NULL, payment_id uuid REFERENCES profi_market.payments,
 received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(provider,event_id)
);
CREATE TABLE profi_market.bonus_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES profi_market.customers,
 order_id uuid REFERENCES profi_market.orders, event_key text NOT NULL UNIQUE,
 delta_minor bigint NOT NULL CHECK(delta_minor<>0),
 available_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE profi_market.partner_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES profi_market.partners,
 order_id uuid NOT NULL REFERENCES profi_market.orders,
 event_key text NOT NULL UNIQUE, delta_minor bigint NOT NULL CHECK(delta_minor<>0),
 available_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE profi_market.payouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES profi_market.partners,
 amount_minor bigint NOT NULL CHECK(amount_minor>0),
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','approved','paid','rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE profi_market.entitlements (
 order_id uuid NOT NULL REFERENCES profi_market.orders, sku text NOT NULL,
 granted_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, PRIMARY KEY(order_id,sku)
);
CREATE TABLE profi_market.audit_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor text NOT NULL, action text NOT NULL,
 object_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bonus_customer_idx ON profi_market.bonus_ledger(customer_id,available_at);
CREATE INDEX partner_entries_idx ON profi_market.partner_ledger(partner_id,available_at);
CREATE INDEX orders_customer_idx ON profi_market.orders(customer_id,created_at DESC);
REVOKE ALL ON ALL TABLES IN SCHEMA profi_market FROM PUBLIC;
COMMIT;
-- Before use: dedicated server role, authentication mapping, transactional settlement,
-- referral/self-referral checks, FIFO bonus expiry and reservation, refund reversals,
-- payout locking and legal approval. Do not expose tables directly to a browser.
