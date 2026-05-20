-- ============================================================
-- Sunflower System - PostgreSQL Schema for Supabase
-- Converted from sunflower_mysql_schema.sql
-- ============================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS financial_transaction_attachments CASCADE;
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS inventory_stock_movements CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS inventory_categories CASCADE;
DROP TABLE IF EXISTS inventory_units CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS otp_verifications CASCADE;
DROP TABLE IF EXISTS password_reset_requests CASCADE;
DROP TABLE IF EXISTS login_logs CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ============================================================
-- Helper trigger function: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE roles (
  role_code    VARCHAR(20)  NOT NULL,
  role_name    VARCHAR(50)  NOT NULL,
  description  VARCHAR(255) NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_code),
  CONSTRAINT uq_roles_name UNIQUE (role_name)
);

CREATE TABLE app_users (
  user_id        BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY,
  full_name      VARCHAR(120) NOT NULL,
  username       VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL,
  phone_number   VARCHAR(30)  NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role_code      VARCHAR(20)  NOT NULL,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by     BIGINT       NULL,
  updated_by     BIGINT       NULL,
  last_login_at  TIMESTAMPTZ  NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ  NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT uq_users_email    UNIQUE (email),
  CONSTRAINT uq_users_phone    UNIQUE (phone_number),
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_code) REFERENCES roles(role_code)
    ON UPDATE CASCADE
);

CREATE TABLE login_logs (
  login_log_id    BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY,
  user_id         BIGINT       NULL,
  username_input  VARCHAR(100) NOT NULL,
  login_status    TEXT         NOT NULL CHECK (login_status IN ('SUCCESS', 'FAILED')),
  login_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ip_address      VARCHAR(45)  NULL,
  user_agent      VARCHAR(255) NULL,
  notes           VARCHAR(255) NULL,
  PRIMARY KEY (login_log_id),
  CONSTRAINT fk_login_logs_user
    FOREIGN KEY (user_id) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE TABLE password_reset_requests (
  password_reset_request_id  BIGINT      NOT NULL GENERATED ALWAYS AS IDENTITY,
  user_id                    BIGINT      NOT NULL,
  request_token              CHAR(36)    NOT NULL,
  reset_status               TEXT        NOT NULL DEFAULT 'PENDING'
    CHECK (reset_status IN ('PENDING', 'PHONE_VERIFIED', 'EMAIL_VERIFIED', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
  requested_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at               TIMESTAMPTZ NULL,
  expires_at                 TIMESTAMPTZ NOT NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (password_reset_request_id),
  CONSTRAINT uq_password_reset_token UNIQUE (request_token),
  CONSTRAINT fk_password_reset_user
    FOREIGN KEY (user_id) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE otp_verifications (
  otp_verification_id        BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY,
  password_reset_request_id  BIGINT       NOT NULL,
  user_id                    BIGINT       NOT NULL,
  otp_channel                TEXT         NOT NULL CHECK (otp_channel IN ('PHONE', 'EMAIL')),
  destination_value          VARCHAR(150) NOT NULL,
  otp_code_hash              VARCHAR(255) NOT NULL,
  verification_status        TEXT         NOT NULL DEFAULT 'SENT'
    CHECK (verification_status IN ('SENT', 'VERIFIED', 'EXPIRED', 'FAILED')),
  sent_at                    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  verified_at                TIMESTAMPTZ  NULL,
  expires_at                 TIMESTAMPTZ  NOT NULL,
  attempt_count              INT          NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  PRIMARY KEY (otp_verification_id),
  CONSTRAINT fk_otp_request
    FOREIGN KEY (password_reset_request_id) REFERENCES password_reset_requests(password_reset_request_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_otp_user
    FOREIGN KEY (user_id) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE inventory_categories (
  inventory_category_id  BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY,
  category_name          VARCHAR(100) NOT NULL,
  description            VARCHAR(255) NULL,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (inventory_category_id),
  CONSTRAINT uq_inventory_categories_name UNIQUE (category_name)
);

CREATE TABLE inventory_units (
  inventory_unit_id  BIGINT      NOT NULL GENERATED ALWAYS AS IDENTITY,
  unit_name          VARCHAR(50) NOT NULL,
  unit_symbol        VARCHAR(20) NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (inventory_unit_id),
  CONSTRAINT uq_inventory_units_name UNIQUE (unit_name)
);

CREATE TABLE inventory_items (
  inventory_item_id      BIGINT        NOT NULL GENERATED ALWAYS AS IDENTITY,
  item_code              VARCHAR(30)   NOT NULL,
  item_name              VARCHAR(120)  NOT NULL,
  inventory_category_id  BIGINT        NOT NULL,
  inventory_unit_id      BIGINT        NOT NULL,
  quantity               NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  minimum_stock          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ideal_stock            NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  stock_status           TEXT          NOT NULL DEFAULT 'AVAILABLE'
    CHECK (stock_status IN ('LOW_STOCK', 'AVAILABLE', 'IN_STOCK')),
  notes                  VARCHAR(255)  NULL,
  last_stock_update_at   TIMESTAMPTZ   NULL,
  created_by             BIGINT        NULL,
  updated_by             BIGINT        NULL,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ   NULL,
  PRIMARY KEY (inventory_item_id),
  CONSTRAINT uq_inventory_items_code UNIQUE (item_code),
  CONSTRAINT fk_inventory_items_category
    FOREIGN KEY (inventory_category_id) REFERENCES inventory_categories(inventory_category_id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_inventory_items_unit
    FOREIGN KEY (inventory_unit_id) REFERENCES inventory_units(inventory_unit_id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_inventory_items_created_by
    FOREIGN KEY (created_by) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_inventory_items_updated_by
    FOREIGN KEY (updated_by) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE TABLE inventory_stock_movements (
  inventory_stock_movement_id  BIGINT        NOT NULL GENERATED ALWAYS AS IDENTITY,
  inventory_item_id            BIGINT        NOT NULL,
  movement_type                TEXT          NOT NULL
    CHECK (movement_type IN ('ADD_ITEM', 'EDIT_ITEM', 'ADD_STOCK', 'REDUCE_STOCK', 'DELETE_ITEM')),
  quantity_before              NUMERIC(12,2) NULL,
  quantity_change              NUMERIC(12,2) NULL,
  quantity_after               NUMERIC(12,2) NULL,
  remarks                      VARCHAR(255)  NULL,
  acted_by                     BIGINT        NULL,
  acted_at                     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (inventory_stock_movement_id),
  CONSTRAINT fk_stock_movements_item
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(inventory_item_id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_stock_movements_actor
    FOREIGN KEY (acted_by) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE TABLE financial_transactions (
  financial_transaction_id  BIGINT        NOT NULL GENERATED ALWAYS AS IDENTITY,
  transaction_code          VARCHAR(30)   NOT NULL,
  user_id                   BIGINT        NOT NULL,
  notes                     VARCHAR(255)  NOT NULL,
  transaction_type          TEXT          NOT NULL CHECK (transaction_type IN ('INCOME', 'EXPENSE')),
  amount                    NUMERIC(14,2) NOT NULL,
  transaction_date          DATE          NOT NULL,
  created_by                BIGINT        NULL,
  updated_by                BIGINT        NULL,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ   NULL,
  PRIMARY KEY (financial_transaction_id),
  CONSTRAINT uq_financial_transactions_code UNIQUE (transaction_code),
  CONSTRAINT fk_financial_transactions_user
    FOREIGN KEY (user_id) REFERENCES app_users(user_id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_financial_transactions_created_by
    FOREIGN KEY (created_by) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_financial_transactions_updated_by
    FOREIGN KEY (updated_by) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE TABLE financial_transaction_attachments (
  financial_transaction_attachment_id  BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY,
  financial_transaction_id             BIGINT       NOT NULL,
  file_name                            VARCHAR(255) NOT NULL,
  file_path                            VARCHAR(255) NULL,
  mime_type                            VARCHAR(100) NULL,
  file_size_bytes                      BIGINT       NULL CHECK (file_size_bytes >= 0),
  uploaded_by                          BIGINT       NULL,
  uploaded_at                          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at                           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (financial_transaction_attachment_id),
  CONSTRAINT fk_financial_attachments_transaction
    FOREIGN KEY (financial_transaction_id) REFERENCES financial_transactions(financial_transaction_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_financial_attachments_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE TABLE activity_logs (
  activity_log_id   BIGINT       NOT NULL GENERATED ALWAYS AS IDENTITY,
  actor_user_id     BIGINT       NULL,
  actor_username    VARCHAR(100) NOT NULL,
  actor_name        VARCHAR(120) NOT NULL,
  feature_name      TEXT         NOT NULL CHECK (feature_name IN ('LOGIN', 'INVENTORY', 'FINANCIAL', 'USER')),
  activity_message  VARCHAR(255) NOT NULL,
  reference_table   VARCHAR(100) NULL,
  reference_id      BIGINT       NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (activity_log_id),
  CONSTRAINT fk_activity_logs_actor
    FOREIGN KEY (actor_user_id) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_role       ON app_users(role_code);
CREATE INDEX idx_users_active     ON app_users(is_active);

CREATE INDEX idx_login_logs_user   ON login_logs(user_id);
CREATE INDEX idx_login_logs_status ON login_logs(login_status);
CREATE INDEX idx_login_logs_time   ON login_logs(login_at);

CREATE INDEX idx_password_reset_user   ON password_reset_requests(user_id);
CREATE INDEX idx_password_reset_status ON password_reset_requests(reset_status);

CREATE INDEX idx_otp_request        ON otp_verifications(password_reset_request_id);
CREATE INDEX idx_otp_user           ON otp_verifications(user_id);
CREATE INDEX idx_otp_channel_status ON otp_verifications(otp_channel, verification_status);

CREATE INDEX idx_inventory_items_name     ON inventory_items(item_name);
CREATE INDEX idx_inventory_items_category ON inventory_items(inventory_category_id);
CREATE INDEX idx_inventory_items_status   ON inventory_items(stock_status);

CREATE INDEX idx_stock_movements_item  ON inventory_stock_movements(inventory_item_id);
CREATE INDEX idx_stock_movements_type  ON inventory_stock_movements(movement_type);
CREATE INDEX idx_stock_movements_actor ON inventory_stock_movements(acted_by);
CREATE INDEX idx_stock_movements_time  ON inventory_stock_movements(acted_at);

CREATE INDEX idx_financial_transactions_user ON financial_transactions(user_id);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);

CREATE INDEX idx_financial_attachments_transaction ON financial_transaction_attachments(financial_transaction_id);
CREATE INDEX idx_financial_attachments_uploader    ON financial_transaction_attachments(uploaded_by);

CREATE INDEX idx_activity_logs_actor      ON activity_logs(actor_user_id);
CREATE INDEX idx_activity_logs_feature    ON activity_logs(feature_name);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================

CREATE TRIGGER set_updated_at_roles
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_app_users
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_password_reset_requests
  BEFORE UPDATE ON password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_inventory_categories
  BEFORE UPDATE ON inventory_categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_inventory_units
  BEFORE UPDATE ON inventory_units
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_inventory_items
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_financial_transactions
  BEFORE UPDATE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_financial_transaction_attachments
  BEFORE UPDATE ON financial_transaction_attachments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Semua akses dari server-side Next.js pakai service_role key
-- ============================================================

ALTER TABLE roles                             ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_units                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_movements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transaction_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs                     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON roles                             FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON app_users                         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON login_logs                        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON password_reset_requests           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON otp_verifications                 FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON inventory_categories              FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON inventory_units                   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON inventory_items                   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON inventory_stock_movements         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON financial_transactions            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON financial_transaction_attachments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON activity_logs                     FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO roles (role_code, role_name, description) VALUES
  ('OWNER', 'Owner', 'Akses penuh ke seluruh modul'),
  ('STAFF', 'Staff', 'Akses terbatas sesuai fitur operasional');

INSERT INTO inventory_units (unit_name, unit_symbol) VALUES
  ('Pcs', 'pcs'),
  ('Gram', 'g'),
  ('Kg', 'kg'),
  ('Liter', 'l'),
  ('Pack', 'pack'),
  ('Bottle', 'btl'),
  ('Tray', 'tray');

INSERT INTO inventory_categories (category_name, description) VALUES
  ('Vegetable', 'Bahan sayur'),
  ('Baking', 'Bahan baking'),
  ('Staple', 'Bahan pokok'),
  ('Beverage', 'Bahan minuman'),
  ('Dairy', 'Produk dairy'),
  ('Spice', 'Bumbu dan rempah'),
  ('Condiment', 'Saus dan pelengkap'),
  ('Bakery', 'Produk roti dan bakery');

INSERT INTO app_users (full_name, username, email, phone_number, password_hash, role_code, is_active) VALUES
  ('Ferry Govert anwar', 'owner/xrk/888', 'ferrygovert323@uvers.ac.id', '089661133111',
   '$2b$10$IyKoM24E9T2Y3cMQe32/f.C2gtC5l6buhBxzTV.KMeHbBVjLiTbh6', 'OWNER', TRUE);
