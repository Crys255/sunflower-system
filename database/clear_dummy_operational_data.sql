USE sunflower_system;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE financial_transaction_attachments;
TRUNCATE TABLE financial_transactions;
TRUNCATE TABLE inventory_stock_movements;
TRUNCATE TABLE inventory_items;
TRUNCATE TABLE activity_logs;
TRUNCATE TABLE login_logs;
TRUNCATE TABLE otp_verifications;
TRUNCATE TABLE password_reset_requests;
DELETE FROM app_users WHERE role_code <> 'OWNER';

SET FOREIGN_KEY_CHECKS = 1;

-- Data berikut tetap dipertahankan:
-- roles
-- inventory_categories
-- inventory_units
-- app_users owner
