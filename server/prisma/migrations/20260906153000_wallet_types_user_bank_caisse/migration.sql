-- Keep only USER / BANK / CAISSE wallet types.
-- User-linked SOCIETE and CENTRAL wallets become USER.
-- Company-level SOCIETE wallets (no user) are removed.
-- COFFRE is renamed to CAISSE.

-- 1. Add CAISSE so existing coffre rows can be remapped
ALTER TABLE `caisses`
  MODIFY `caisse_type` ENUM('CENTRAL', 'SOCIETE', 'USER', 'BANK', 'COFFRE', 'CAISSE') NOT NULL;

-- 2. User-linked SOCIETE / CENTRAL wallets become USER
UPDATE `caisses`
SET `caisse_type` = 'USER'
WHERE `caisse_type` IN ('SOCIETE', 'CENTRAL')
  AND `user_id` IS NOT NULL;

-- 3. Detach leftover company SOCIETE wallets, then delete them
UPDATE `delivery_shifts`
SET `remittance_caisse_id` = NULL
WHERE `remittance_caisse_id` IN (
  SELECT `id` FROM (SELECT `id` FROM `caisses` WHERE `caisse_type` = 'SOCIETE') AS `_societe_wallets`
);

UPDATE `caisse_transactions`
SET `reference_caisse_id` = NULL
WHERE `reference_caisse_id` IN (
  SELECT `id` FROM (SELECT `id` FROM `caisses` WHERE `caisse_type` = 'SOCIETE') AS `_societe_wallets`
);

DELETE FROM `caisses`
WHERE `caisse_type` = 'SOCIETE';

-- 4. Any leftover CENTRAL without a user becomes USER
UPDATE `caisses`
SET `caisse_type` = 'USER'
WHERE `caisse_type` = 'CENTRAL';

-- 5. Rename coffre-fort to caisse
UPDATE `caisses`
SET `caisse_type` = 'CAISSE'
WHERE `caisse_type` = 'COFFRE';

-- 6. Shrink the enum
ALTER TABLE `caisses`
  MODIFY `caisse_type` ENUM('USER', 'BANK', 'CAISSE') NOT NULL;
