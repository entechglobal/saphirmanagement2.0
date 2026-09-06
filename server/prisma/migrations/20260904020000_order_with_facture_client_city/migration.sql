-- AlterTable
ALTER TABLE `bon_livraisons` ADD COLUMN `with_facture` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `clients` ADD COLUMN `city` VARCHAR(100) NULL;

-- Backfill city from the previous region/city field
UPDATE `clients` SET `city` = `region` WHERE `city` IS NULL AND `region` IS NOT NULL AND `region` <> '';
