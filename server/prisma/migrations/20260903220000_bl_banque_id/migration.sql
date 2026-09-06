-- AlterTable
ALTER TABLE `bon_livraisons` ADD COLUMN `banque_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `bon_livraisons_banque_id_idx` ON `bon_livraisons`(`banque_id`);

-- AddForeignKey
ALTER TABLE `bon_livraisons` ADD CONSTRAINT `bon_livraisons_banque_id_fkey` FOREIGN KEY (`banque_id`) REFERENCES `banques`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
