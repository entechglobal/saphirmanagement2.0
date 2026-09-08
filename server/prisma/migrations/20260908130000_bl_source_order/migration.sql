-- Link STANDARD delivery notes created from ADVANCED orders (PREPARE)
ALTER TABLE `bon_livraisons` ADD COLUMN `source_order_id` INTEGER NULL;

CREATE INDEX `bon_livraisons_source_order_id_idx` ON `bon_livraisons`(`source_order_id`);

ALTER TABLE `bon_livraisons`
  ADD CONSTRAINT `bon_livraisons_source_order_id_fkey`
  FOREIGN KEY (`source_order_id`) REFERENCES `bon_livraisons`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
