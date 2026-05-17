-- Jalankan file ini sebagai admin MySQL yang memiliki hak CREATE USER / GRANT.
-- Ganti password di bawah sebelum dipakai untuk production.

CREATE USER IF NOT EXISTS 'sunflower_app'@'localhost'
IDENTIFIED BY 'CHANGE_ME_SUNFLOWER_DB_PASSWORD!';

CREATE USER IF NOT EXISTS 'sunflower_app'@'%'
IDENTIFIED BY 'CHANGE_ME_SUNFLOWER_DB_PASSWORD!';

GRANT SELECT, INSERT, UPDATE, DELETE
ON sunflower_system.*
TO 'sunflower_app'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE
ON sunflower_system.*
TO 'sunflower_app'@'%';

FLUSH PRIVILEGES;

-- Verifikasi manual setelah dijalankan:
-- SHOW GRANTS FOR 'sunflower_app'@'localhost';
-- SHOW GRANTS FOR 'sunflower_app'@'%';
