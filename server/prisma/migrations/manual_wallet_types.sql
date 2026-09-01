-- Wallet system extension (idempotent — safe to re-run)
-- Do NOT use `prisma db push` on this project; run this script in MySQL instead.

-- 1. Extend CaisseType enum
ALTER TABLE `caisses`
  MODIFY COLUMN `caisse_type` ENUM('CENTRAL','SOCIETE','USER','BANK','COFFRE') NOT NULL;

-- 2. Extend CaisseTransactionType enum
ALTER TABLE `caisse_transactions`
  MODIFY COLUMN `transaction_type` ENUM(
    'INITIAL_BALANCE','CHARGE','TRANSFER_IN','TRANSFER_OUT','INCOME','EXPENSE'
  ) NOT NULL;

-- 3. Make user_id optional on caisses
ALTER TABLE `caisses`
  MODIFY COLUMN `user_id` INT NULL;

-- 4. Add columns if missing (MySQL 8+)
SET @db = DATABASE();

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'caisses' AND COLUMN_NAME = 'banque_id') = 0,
  'ALTER TABLE `caisses` ADD COLUMN `banque_id` INT NULL AFTER `societe_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'caisses' AND COLUMN_NAME = 'created_by_id') = 0,
  'ALTER TABLE `caisses` ADD COLUMN `created_by_id` INT NULL AFTER `active`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'caisse_transactions' AND COLUMN_NAME = 'reglement_client_id') = 0,
  'ALTER TABLE `caisse_transactions` ADD COLUMN `reglement_client_id` INT NULL AFTER `reference_caisse_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'caisse_transactions' AND COLUMN_NAME = 'reglement_fournisseur_id') = 0,
  'ALTER TABLE `caisse_transactions` ADD COLUMN `reglement_fournisseur_id` INT NULL AFTER `reglement_client_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. Indexes (ignore if already exist)
CREATE INDEX IF NOT EXISTS `caisses_banque_id_idx` ON `caisses`(`banque_id`);
CREATE INDEX IF NOT EXISTS `caisses_created_by_id_idx` ON `caisses`(`created_by_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `caisses_societe_id_banque_id_key` ON `caisses`(`societe_id`, `banque_id`);
CREATE INDEX IF NOT EXISTS `caisse_transactions_reglement_client_id_idx` ON `caisse_transactions`(`reglement_client_id`);
CREATE INDEX IF NOT EXISTS `caisse_transactions_reglement_fournisseur_id_idx` ON `caisse_transactions`(`reglement_fournisseur_id`);

-- 6. Foreign keys (add only if missing)
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'caisses' AND CONSTRAINT_NAME = 'caisses_banque_id_fkey') = 0,
  'ALTER TABLE `caisses` ADD CONSTRAINT `caisses_banque_id_fkey` FOREIGN KEY (`banque_id`) REFERENCES `banques`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'caisses' AND CONSTRAINT_NAME = 'caisses_created_by_id_fkey') = 0,
  'ALTER TABLE `caisses` ADD CONSTRAINT `caisses_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'caisse_transactions' AND CONSTRAINT_NAME = 'caisse_transactions_reglement_client_id_fkey') = 0,
  'ALTER TABLE `caisse_transactions` ADD CONSTRAINT `caisse_transactions_reglement_client_id_fkey` FOREIGN KEY (`reglement_client_id`) REFERENCES `reglement_clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'caisse_transactions' AND CONSTRAINT_NAME = 'caisse_transactions_reglement_fournisseur_id_fkey') = 0,
  'ALTER TABLE `caisse_transactions` ADD CONSTRAINT `caisse_transactions_reglement_fournisseur_id_fkey` FOREIGN KEY (`reglement_fournisseur_id`) REFERENCES `reglement_fournisseurs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
