-- CreateTable
CREATE TABLE `delivery_shifts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `delivery_id` INTEGER NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_at` DATETIME(3) NULL,
    `opening_balance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `closing_balance` DECIMAL(10, 2) NULL,
    `total_collected` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total_orders` INTEGER NOT NULL DEFAULT 0,
    `delivered_count` INTEGER NOT NULL DEFAULT 0,
    `paid_count` INTEGER NOT NULL DEFAULT 0,
    `remitted_amount` DECIMAL(10, 2) NULL,
    `remittance_note` TEXT NULL,
    `remittance_caisse_id` INTEGER NULL,
    `transfer_request_id` INTEGER NULL,
    `remittance_completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `delivery_shifts_societe_id_idx`(`societe_id`),
    INDEX `delivery_shifts_user_id_idx`(`user_id`),
    INDEX `delivery_shifts_delivery_id_idx`(`delivery_id`),
    INDEX `delivery_shifts_status_idx`(`status`),
    INDEX `delivery_shifts_started_at_idx`(`started_at`),
    INDEX `delivery_shifts_remittance_caisse_id_idx`(`remittance_caisse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_shift_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shift_id` INTEGER NOT NULL,
    `bon_livraison_id` INTEGER NOT NULL,
    `linked_status` ENUM('EN_COURS', 'CONFIRME', 'PREPARE', 'COLLECTE', 'EN_ROUTE', 'LIVRE', 'ANNULE', 'REPORTE', 'PAYE', 'UPDATE', 'SUSPENDED', 'CONTINUED') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `linked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `delivery_shift_orders_bon_livraison_id_idx`(`bon_livraison_id`),
    INDEX `delivery_shift_orders_linked_at_idx`(`linked_at`),
    UNIQUE INDEX `delivery_shift_orders_shift_id_bon_livraison_id_key`(`shift_id`, `bon_livraison_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `delivery_shifts` ADD CONSTRAINT `delivery_shifts_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_shifts` ADD CONSTRAINT `delivery_shifts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_shifts` ADD CONSTRAINT `delivery_shifts_delivery_id_fkey` FOREIGN KEY (`delivery_id`) REFERENCES `deliveries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_shifts` ADD CONSTRAINT `delivery_shifts_remittance_caisse_id_fkey` FOREIGN KEY (`remittance_caisse_id`) REFERENCES `caisses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_shift_orders` ADD CONSTRAINT `delivery_shift_orders_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `delivery_shifts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_shift_orders` ADD CONSTRAINT `delivery_shift_orders_bon_livraison_id_fkey` FOREIGN KEY (`bon_livraison_id`) REFERENCES `bon_livraisons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
