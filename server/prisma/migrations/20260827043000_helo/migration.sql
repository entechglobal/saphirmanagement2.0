/*
  Warnings:

  - You are about to alter the column `document_date` on the `bon_livraisons` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `date_reception` on the `bon_receptions` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `document_date` on the `bon_retour_clients` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `date` on the `reglement_clients` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `date` on the `reglement_fournisseurs` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - A unique constraint covering the columns `[societe_id,banque_id]` on the table `caisses` will be added. If there are existing duplicate values, this will fail.
  - Made the column `date_livraison` on table `bon_livraisons` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `bon_livraisons` MODIFY `document_date` DATETIME NOT NULL,
    MODIFY `date_livraison` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `bon_receptions` MODIFY `date_reception` DATETIME NULL;

-- AlterTable
ALTER TABLE `bon_retour_clients` MODIFY `document_date` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `caisse_transactions` ADD COLUMN `reglement_client_id` INTEGER NULL,
    ADD COLUMN `reglement_fournisseur_id` INTEGER NULL,
    MODIFY `transaction_type` ENUM('INITIAL_BALANCE', 'CHARGE', 'TRANSFER_IN', 'TRANSFER_OUT', 'INCOME', 'EXPENSE') NOT NULL;

-- AlterTable
ALTER TABLE `caisses` ADD COLUMN `banque_id` INTEGER NULL,
    ADD COLUMN `created_by_id` INTEGER NULL,
    MODIFY `user_id` INTEGER NULL,
    MODIFY `caisse_type` ENUM('CENTRAL', 'SOCIETE', 'USER', 'BANK', 'COFFRE') NOT NULL;

-- AlterTable
ALTER TABLE `reglement_clients` MODIFY `date` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `reglement_fournisseurs` MODIFY `date` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `societes` ADD COLUMN `document_header_config` JSON NULL;

-- CreateIndex
CREATE INDEX `caisse_transactions_reglement_client_id_idx` ON `caisse_transactions`(`reglement_client_id`);

-- CreateIndex
CREATE INDEX `caisse_transactions_reglement_fournisseur_id_idx` ON `caisse_transactions`(`reglement_fournisseur_id`);

-- CreateIndex
CREATE INDEX `caisses_banque_id_idx` ON `caisses`(`banque_id`);

-- CreateIndex
CREATE INDEX `caisses_created_by_id_idx` ON `caisses`(`created_by_id`);

-- CreateIndex
CREATE UNIQUE INDEX `caisses_societe_id_banque_id_key` ON `caisses`(`societe_id`, `banque_id`);

-- AddForeignKey
ALTER TABLE `caisses` ADD CONSTRAINT `caisses_banque_id_fkey` FOREIGN KEY (`banque_id`) REFERENCES `banques`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisses` ADD CONSTRAINT `caisses_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisse_transactions` ADD CONSTRAINT `caisse_transactions_reglement_client_id_fkey` FOREIGN KEY (`reglement_client_id`) REFERENCES `reglement_clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisse_transactions` ADD CONSTRAINT `caisse_transactions_reglement_fournisseur_id_fkey` FOREIGN KEY (`reglement_fournisseur_id`) REFERENCES `reglement_fournisseurs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
