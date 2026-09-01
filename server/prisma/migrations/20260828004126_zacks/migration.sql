/*
  Warnings:

  - You are about to alter the column `document_date` on the `bon_livraisons` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `date_livraison` on the `bon_livraisons` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `date_reception` on the `bon_receptions` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `document_date` on the `bon_retour_clients` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `date` on the `reglement_clients` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `date` on the `reglement_fournisseurs` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.

*/
-- AlterTable
ALTER TABLE `bon_livraisons` MODIFY `document_date` DATETIME NOT NULL,
    MODIFY `date_livraison` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `bon_receptions` MODIFY `date_reception` DATETIME NULL;

-- AlterTable
ALTER TABLE `bon_retour_clients` MODIFY `document_date` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `reglement_clients` MODIFY `date` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `reglement_fournisseurs` MODIFY `date` DATETIME NOT NULL;

-- CreateTable
CREATE TABLE `commande_fournisseurs` (
    `id` INTEGER NOT NULL,
    `document_date` DATE NOT NULL,
    `date_livraison_prevue` DATE NULL,
    `conditions_paiement` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `commande_fournisseurs_document_date_idx`(`document_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `commande_fournisseurs` ADD CONSTRAINT `commande_fournisseurs_id_fkey` FOREIGN KEY (`id`) REFERENCES `fournisseur_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
