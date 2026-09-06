-- AlterTable
ALTER TABLE `articles` ADD COLUMN `commission` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `packs` ADD COLUMN `commission` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `client_document_lines` ADD COLUMN `commission` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `bon_livraison_pack_lines` ADD COLUMN `commission` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `bon_livraisons` ADD COLUMN `total_commission` DECIMAL(12, 2) NOT NULL DEFAULT 0;
