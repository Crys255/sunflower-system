DROP DATABASE IF EXISTS sunflower_system;

CREATE DATABASE IF NOT EXISTS sunflower_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sunflower_system;

SET NAMES utf8mb4;

DROP TABLE IF EXISTS financial_transaction_attachments;
DROP TABLE IF EXISTS financial_transactions;
DROP TABLE IF EXISTS inventory_stock_movements;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS inventory_categories;
DROP TABLE IF EXISTS inventory_units;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS password_reset_requests;
DROP TABLE IF EXISTS otp_verifications;
DROP TABLE IF EXISTS login_logs;
DROP TABLE IF EXISTS app_users;
DROP TABLE IF EXISTS roles;

CREATE TABLE roles (
  role_code VARCHAR(20) NOT NULL,
  role_name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (role_code),
  UNIQUE KEY uq_roles_name (role_name)
) ENGINE=InnoDB;

CREATE TABLE app_users (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone_number VARCHAR(30) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_code VARCHAR(20) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone_number),
  KEY idx_users_role (role_code),
  KEY idx_users_active (is_active),
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_code) REFERENCES roles(role_code)
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE login_logs (
  login_log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  username_input VARCHAR(100) NOT NULL,
  login_status ENUM('SUCCESS', 'FAILED') NOT NULL,
  login_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  notes VARCHAR(255) NULL,
  PRIMARY KEY (login_log_id),
  KEY idx_login_logs_user (user_id),
  KEY idx_login_logs_status (login_status),
  KEY idx_login_logs_time (login_at),
  CONSTRAINT fk_login_logs_user
    FOREIGN KEY (user_id) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE password_reset_requests (
  password_reset_request_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  request_token CHAR(36) NOT NULL,
  reset_status ENUM('PENDING', 'PHONE_VERIFIED', 'EMAIL_VERIFIED', 'COMPLETED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (password_reset_request_id),
  UNIQUE KEY uq_password_reset_token (request_token),
  KEY idx_password_reset_user (user_id),
  KEY idx_password_reset_status (reset_status),
  CONSTRAINT fk_password_reset_user
    FOREIGN KEY (user_id) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE otp_verifications (
  otp_verification_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  password_reset_request_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  otp_channel ENUM('PHONE', 'EMAIL') NOT NULL,
  destination_value VARCHAR(150) NOT NULL,
  otp_code_hash VARCHAR(255) NOT NULL,
  verification_status ENUM('SENT', 'VERIFIED', 'EXPIRED', 'FAILED') NOT NULL DEFAULT 'SENT',
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (otp_verification_id),
  KEY idx_otp_request (password_reset_request_id),
  KEY idx_otp_user (user_id),
  KEY idx_otp_channel_status (otp_channel, verification_status),
  CONSTRAINT fk_otp_request
    FOREIGN KEY (password_reset_request_id) REFERENCES password_reset_requests(password_reset_request_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_otp_user
    FOREIGN KEY (user_id) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE inventory_categories (
  inventory_category_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (inventory_category_id),
  UNIQUE KEY uq_inventory_categories_name (category_name)
) ENGINE=InnoDB;

CREATE TABLE inventory_units (
  inventory_unit_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_name VARCHAR(50) NOT NULL,
  unit_symbol VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (inventory_unit_id),
  UNIQUE KEY uq_inventory_units_name (unit_name)
) ENGINE=InnoDB;

CREATE TABLE inventory_items (
  inventory_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_code VARCHAR(30) NOT NULL,
  item_name VARCHAR(120) NOT NULL,
  inventory_category_id BIGINT UNSIGNED NOT NULL,
  inventory_unit_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  minimum_stock DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ideal_stock DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  stock_status ENUM('LOW_STOCK', 'AVAILABLE', 'IN_STOCK') NOT NULL DEFAULT 'AVAILABLE',
  notes VARCHAR(255) NULL,
  last_stock_update_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (inventory_item_id),
  UNIQUE KEY uq_inventory_items_code (item_code),
  KEY idx_inventory_items_name (item_name),
  KEY idx_inventory_items_category (inventory_category_id),
  KEY idx_inventory_items_status (stock_status),
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
) ENGINE=InnoDB;

CREATE TABLE inventory_stock_movements (
  inventory_stock_movement_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  inventory_item_id BIGINT UNSIGNED NOT NULL,
  movement_type ENUM('ADD_ITEM', 'EDIT_ITEM', 'ADD_STOCK', 'REDUCE_STOCK', 'DELETE_ITEM') NOT NULL,
  quantity_before DECIMAL(12,2) NULL,
  quantity_change DECIMAL(12,2) NULL,
  quantity_after DECIMAL(12,2) NULL,
  remarks VARCHAR(255) NULL,
  acted_by BIGINT UNSIGNED NULL,
  acted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (inventory_stock_movement_id),
  KEY idx_stock_movements_item (inventory_item_id),
  KEY idx_stock_movements_type (movement_type),
  KEY idx_stock_movements_actor (acted_by),
  KEY idx_stock_movements_time (acted_at),
  CONSTRAINT fk_stock_movements_item
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(inventory_item_id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_stock_movements_actor
    FOREIGN KEY (acted_by) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE financial_transactions (
  financial_transaction_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_code VARCHAR(30) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  notes VARCHAR(255) NOT NULL,
  transaction_type ENUM('INCOME', 'EXPENSE') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  transaction_date DATE NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (financial_transaction_id),
  UNIQUE KEY uq_financial_transactions_code (transaction_code),
  KEY idx_financial_transactions_user (user_id),
  KEY idx_financial_transactions_type (transaction_type),
  KEY idx_financial_transactions_date (transaction_date),
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
) ENGINE=InnoDB;

CREATE TABLE financial_transaction_attachments (
  financial_transaction_attachment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  financial_transaction_id BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NULL,
  mime_type VARCHAR(100) NULL,
  file_size_bytes BIGINT UNSIGNED NULL,
  uploaded_by BIGINT UNSIGNED NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (financial_transaction_attachment_id),
  KEY idx_financial_attachments_transaction (financial_transaction_id),
  KEY idx_financial_attachments_uploaded_by (uploaded_by),
  CONSTRAINT fk_financial_attachments_transaction
    FOREIGN KEY (financial_transaction_id) REFERENCES financial_transactions(financial_transaction_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_financial_attachments_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
  activity_log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_username VARCHAR(100) NOT NULL,
  actor_name VARCHAR(120) NOT NULL,
  feature_name ENUM('LOGIN', 'INVENTORY', 'FINANCIAL', 'USER') NOT NULL,
  activity_message VARCHAR(255) NOT NULL,
  reference_table VARCHAR(100) NULL,
  reference_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (activity_log_id),
  KEY idx_activity_logs_actor (actor_user_id),
  KEY idx_activity_logs_feature (feature_name),
  KEY idx_activity_logs_created_at (created_at),
  CONSTRAINT fk_activity_logs_actor
    FOREIGN KEY (actor_user_id) REFERENCES app_users(user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

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

INSERT INTO app_users (
  full_name,
  username,
  email,
  phone_number,
  password_hash,
  role_code,
  is_active
) VALUES
  ('Ferry Govert anwar', 'owner/xrk/888', 'ferrygovert323@uvers.ac.id', '089661133111', '$2b$10$IyKoM24E9T2Y3cMQe32/f.C2gtC5l6buhBxzTV.KMeHbBVjLiTbh6', 'OWNER', 1);
