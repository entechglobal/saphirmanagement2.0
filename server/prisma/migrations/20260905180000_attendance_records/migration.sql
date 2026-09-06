-- CreateTable
CREATE TABLE `attendance_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `device_user_id` VARCHAR(50) NOT NULL,
    `device_uid` INTEGER NULL,
    `punch_time` DATETIME(3) NOT NULL,
    `punch_type` INTEGER NOT NULL DEFAULT 0,
    `verify_mode` INTEGER NULL,
    `device_ip` VARCHAR(64) NOT NULL DEFAULT '',
    `device_sn` VARCHAR(64) NULL,
    `imported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attendance_records_societe_id_punch_time_idx`(`societe_id`, `punch_time`),
    INDEX `attendance_records_user_id_punch_time_idx`(`user_id`, `punch_time`),
    INDEX `attendance_records_imported_at_idx`(`imported_at`),
    UNIQUE INDEX `attendance_dedup`(`societe_id`, `device_ip`, `device_user_id`, `punch_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
