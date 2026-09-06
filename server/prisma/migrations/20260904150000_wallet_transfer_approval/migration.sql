-- CreateTable
CREATE TABLE `caisse_transfer_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source_caisse_id` INTEGER NOT NULL,
    `destination_caisse_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `note` TEXT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'DECLINED') NOT NULL DEFAULT 'PENDING',
    `requires_super_admin` BOOLEAN NOT NULL DEFAULT false,
    `created_by_id` INTEGER NOT NULL,
    `responded_by_id` INTEGER NULL,
    `responded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `caisse_transfer_requests_status_idx`(`status`),
    INDEX `caisse_transfer_requests_source_caisse_id_idx`(`source_caisse_id`),
    INDEX `caisse_transfer_requests_destination_caisse_id_idx`(`destination_caisse_id`),
    INDEX `caisse_transfer_requests_created_by_id_idx`(`created_by_id`),
    INDEX `caisse_transfer_requests_requires_super_admin_idx`(`requires_super_admin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` ENUM('WALLET_TRANSFER_REQUEST', 'WALLET_TRANSFER_ACCEPTED', 'WALLET_TRANSFER_DECLINED') NOT NULL,
    `payload` JSON NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `transfer_request_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_read_idx`(`user_id`, `read`),
    INDEX `notifications_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `notifications_transfer_request_id_idx`(`transfer_request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `caisse_transfer_requests` ADD CONSTRAINT `caisse_transfer_requests_source_caisse_id_fkey` FOREIGN KEY (`source_caisse_id`) REFERENCES `caisses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisse_transfer_requests` ADD CONSTRAINT `caisse_transfer_requests_destination_caisse_id_fkey` FOREIGN KEY (`destination_caisse_id`) REFERENCES `caisses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisse_transfer_requests` ADD CONSTRAINT `caisse_transfer_requests_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisse_transfer_requests` ADD CONSTRAINT `caisse_transfer_requests_responded_by_id_fkey` FOREIGN KEY (`responded_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_transfer_request_id_fkey` FOREIGN KEY (`transfer_request_id`) REFERENCES `caisse_transfer_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
