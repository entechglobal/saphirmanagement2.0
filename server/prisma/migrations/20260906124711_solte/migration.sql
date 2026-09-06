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

-- RedefineIndex
CREATE UNIQUE INDEX `attendance_records_societe_id_device_ip_device_user_id_punch_key` ON `attendance_records`(`societe_id`, `device_ip`, `device_user_id`, `punch_time`);
DROP INDEX `attendance_dedup` ON `attendance_records`;
