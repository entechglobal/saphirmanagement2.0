-- CreateTable
CREATE TABLE `delivery_provider_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `api_id` VARCHAR(255) NOT NULL,
    `api_key` VARCHAR(255) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `metadata` JSON NULL,

    INDEX `delivery_provider_configs_societe_id_provider_idx`(`societe_id`, `provider`),
    INDEX `delivery_provider_configs_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `societes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `raison_social` VARCHAR(255) NOT NULL,
    `logo` TEXT NULL,
    `address` TEXT NULL,
    `tel` VARCHAR(20) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `site_web` VARCHAR(255) NULL,
    `ice` VARCHAR(15) NULL,
    `rc` VARCHAR(20) NULL,
    `tp` VARCHAR(20) NULL,
    `if` VARCHAR(20) NULL,
    `fixed_structure` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `societes_ice_key`(`ice`),
    INDEX `societes_ice_idx`(`ice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `depots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `region` VARCHAR(100) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `manager` VARCHAR(255) NULL,
    `type` ENUM('PRINCIPAL', 'SECONDARY', 'OUTLET', 'TRANSIT') NOT NULL DEFAULT 'PRINCIPAL',
    `surface` DECIMAL(10, 2) NULL,
    `capacity` DECIMAL(10, 2) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `depots_societe_id_idx`(`societe_id`),
    INDEX `depots_active_idx`(`active`),
    INDEX `depots_type_idx`(`type`),
    UNIQUE INDEX `depots_societe_id_code_key`(`societe_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_by_depot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `depot_id` INTEGER NOT NULL,
    `article_id` INTEGER NULL,
    `variant_id` INTEGER NULL,
    `quantity_available` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `quantity_reserved` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `quantity_in_transit` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `alert_threshold` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `location` VARCHAR(50) NULL,
    `last_inventory_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `stock_by_depot_depot_id_idx`(`depot_id`),
    INDEX `stock_by_depot_article_id_idx`(`article_id`),
    INDEX `stock_by_depot_variant_id_idx`(`variant_id`),
    INDEX `stock_by_depot_quantity_available_idx`(`quantity_available`),
    UNIQUE INDEX `stock_by_depot_depot_id_article_id_key`(`depot_id`, `article_id`),
    UNIQUE INDEX `stock_by_depot_depot_id_variant_id_key`(`depot_id`, `variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `allowNegativeStock` BOOLEAN NOT NULL DEFAULT false,
    `systemStartHour` INTEGER NULL,
    `systemEndHour` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings_change_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settingName` VARCHAR(100) NOT NULL,
    `oldValue` TEXT NULL,
    `newValue` TEXT NULL,
    `changedBy` INTEGER NOT NULL,
    `reason` VARCHAR(500) NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `settings_change_log_settingName_idx`(`settingName`),
    INDEX `settings_change_log_changedAt_idx`(`changedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `is_super_admin` BOOLEAN NOT NULL DEFAULT false,
    `profile` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `role_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_id_idx`(`role_id`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_societe_id_idx`(`societe_id`),
    INDEX `users_is_super_admin_idx`(`is_super_admin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permissions_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,

    INDEX `role_permissions_permission_id_idx`(`permission_id`),
    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_extra_permissions` (
    `user_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,

    INDEX `user_extra_permissions_permission_id_idx`(`permission_id`),
    PRIMARY KEY (`user_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_removed_permissions` (
    `user_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,

    INDEX `user_removed_permissions_permission_id_idx`(`permission_id`),
    PRIMARY KEY (`user_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `image` TEXT NULL,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `afficher` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_name_key`(`name`),
    INDEX `categories_visible_idx`(`visible`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `families` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `manage_in_stock` BOOLEAN NOT NULL DEFAULT false,
    `TVA` DECIMAL(10, 2) NOT NULL,
    `image` TEXT NULL,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `afficher` JSON NULL,
    `remise` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `families_name_key`(`name`),
    INDEX `families_category_id_idx`(`category_id`),
    INDEX `families_visible_idx`(`visible`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `units` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `symbol` VARCHAR(10) NOT NULL,
    `allows_fractional` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `units_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attributes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attributes_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attribute_values` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `attribute_id` INTEGER NOT NULL,
    `value` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `attribute_values_attribute_id_idx`(`attribute_id`),
    UNIQUE INDEX `attribute_values_attribute_id_value_key`(`attribute_id`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `articles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `family_id` INTEGER NOT NULL,
    `barcode` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `image` TEXT NULL,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `gere_en_stock` BOOLEAN NOT NULL DEFAULT true,
    `unite_principale_id` INTEGER NOT NULL,
    `unite_secondaire_id` INTEGER NULL,
    `unite_complementaire_id` INTEGER NULL,
    `conversion_secondaire` DECIMAL(10, 4) NULL,
    `conversion_complementaire` DECIMAL(10, 4) NULL,
    `prix_achat` DECIMAL(10, 2) NOT NULL,
    `prix_vente_1` DECIMAL(10, 2) NOT NULL,
    `prix_vente_2` DECIMAL(10, 2) NOT NULL,
    `prix_vente_3` DECIMAL(10, 2) NOT NULL,
    `date_expiration` DATE NULL,
    `duree_expiration` VARCHAR(50) NULL,
    `remise` DECIMAL(5, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `articles_barcode_key`(`barcode`),
    INDEX `articles_family_id_idx`(`family_id`),
    INDEX `articles_barcode_idx`(`barcode`),
    INDEX `articles_gere_en_stock_idx`(`gere_en_stock`),
    INDEX `articles_unite_principale_id_idx`(`unite_principale_id`),
    INDEX `articles_visible_idx`(`visible`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `article_variants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `article_id` INTEGER NOT NULL,
    `barcode` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `article_variants_barcode_key`(`barcode`),
    INDEX `article_variants_article_id_idx`(`article_id`),
    INDEX `article_variants_barcode_idx`(`barcode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `variant_attributes` (
    `variant_id` INTEGER NOT NULL,
    `attribute_id` INTEGER NOT NULL,
    `attribute_value_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `variant_attributes_attribute_id_idx`(`attribute_id`),
    INDEX `variant_attributes_attribute_value_id_idx`(`attribute_value_id`),
    PRIMARY KEY (`variant_id`, `attribute_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `societe_pricing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `article_id` INTEGER NULL,
    `variant_id` INTEGER NULL,
    `prix_achat` DECIMAL(10, 2) NULL,
    `prix_vente_1` DECIMAL(10, 2) NULL,
    `prix_vente_2` DECIMAL(10, 2) NULL,
    `prix_vente_3` DECIMAL(10, 2) NULL,
    `remise` DECIMAL(5, 2) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `societe_pricing_societe_id_idx`(`societe_id`),
    INDEX `societe_pricing_article_id_idx`(`article_id`),
    INDEX `societe_pricing_variant_id_idx`(`variant_id`),
    INDEX `societe_pricing_active_idx`(`active`),
    UNIQUE INDEX `societe_pricing_societe_id_article_id_key`(`societe_id`, `article_id`),
    UNIQUE INDEX `societe_pricing_societe_id_variant_id_key`(`societe_id`, `variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` ENUM('PARTICULIER', 'SOCIETE') NOT NULL DEFAULT 'PARTICULIER',
    `address` TEXT NULL,
    `region` VARCHAR(100) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `website` VARCHAR(255) NULL,
    `ice` VARCHAR(15) NULL,
    `if` VARCHAR(20) NULL,
    `rc` VARCHAR(20) NULL,
    `tp` VARCHAR(20) NULL,
    `credit_limit` DECIMAL(10, 2) NULL,
    `payment_deadline` INTEGER NULL,
    `discount` DECIMAL(5, 2) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `clients_societe_id_idx`(`societe_id`),
    INDEX `clients_name_idx`(`name`),
    INDEX `clients_active_idx`(`active`),
    INDEX `clients_type_idx`(`type`),
    UNIQUE INDEX `clients_societe_id_phone_key`(`societe_id`, `phone`),
    UNIQUE INDEX `clients_societe_id_ice_key`(`societe_id`, `ice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fournisseurs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` ENUM('PARTICULIER', 'SOCIETE') NOT NULL DEFAULT 'SOCIETE',
    `address` TEXT NULL,
    `region` VARCHAR(100) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `website` VARCHAR(255) NULL,
    `ice` VARCHAR(15) NULL,
    `if` VARCHAR(20) NULL,
    `rc` VARCHAR(20) NULL,
    `tp` VARCHAR(20) NULL,
    `payment_deadline` INTEGER NULL,
    `bank_account` VARCHAR(50) NULL,
    `bank_name` VARCHAR(100) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `fournisseurs_societe_id_idx`(`societe_id`),
    INDEX `fournisseurs_name_idx`(`name`),
    INDEX `fournisseurs_active_idx`(`active`),
    INDEX `fournisseurs_type_idx`(`type`),
    UNIQUE INDEX `fournisseurs_societe_id_phone_key`(`societe_id`, `phone`),
    UNIQUE INDEX `fournisseurs_societe_id_ice_key`(`societe_id`, `ice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deliveries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` ENUM('INTERN', 'EXTERN') NOT NULL DEFAULT 'EXTERN',
    `entity_type` ENUM('PARTICULIER', 'SOCIETE') NOT NULL DEFAULT 'PARTICULIER',
    `address` TEXT NULL,
    `tel` VARCHAR(20) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `deliveries_user_id_key`(`user_id`),
    INDEX `deliveries_societe_id_idx`(`societe_id`),
    INDEX `deliveries_active_idx`(`active`),
    INDEX `deliveries_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banques` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `RIB` VARCHAR(50) NULL,
    `ville` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `localisation` TEXT NULL,
    `responsable` VARCHAR(255) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `agences_societe_id_idx`(`societe_id`),
    INDEX `agences_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `packs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `barcode` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `cout_revient` DECIMAL(10, 2) NOT NULL,
    `taux_marge` DECIMAL(5, 2) NOT NULL,
    `montant_vente_articles` DECIMAL(10, 2) NOT NULL,
    `remise` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `prix_vente_pack` DECIMAL(10, 2) NOT NULL,
    `purchase_price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `packs_barcode_key`(`barcode`),
    INDEX `packs_societe_id_idx`(`societe_id`),
    INDEX `packs_barcode_idx`(`barcode`),
    INDEX `packs_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pack_components` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pack_id` INTEGER NOT NULL,
    `article_id` INTEGER NULL,
    `variant_id` INTEGER NULL,
    `quantity` DECIMAL(10, 3) NOT NULL,
    `price_field` VARCHAR(20) NOT NULL DEFAULT 'prixVente1',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pack_components_pack_id_idx`(`pack_id`),
    INDEX `pack_components_article_id_idx`(`article_id`),
    INDEX `pack_components_variant_id_idx`(`variant_id`),
    UNIQUE INDEX `pack_components_pack_id_article_id_key`(`pack_id`, `article_id`),
    UNIQUE INDEX `pack_components_pack_id_variant_id_key`(`pack_id`, `variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bon_retour_client_pack_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bon_retour_client_id` INTEGER NOT NULL,
    `pack_id` INTEGER NOT NULL,
    `quantity` DECIMAL(10, 3) NOT NULL,
    `prix_vente` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bon_retour_client_pack_lines_bon_retour_client_id_idx`(`bon_retour_client_id`),
    INDEX `bon_retour_client_pack_lines_pack_id_idx`(`pack_id`),
    UNIQUE INDEX `bon_retour_client_pack_lines_bon_retour_client_id_pack_id_key`(`bon_retour_client_id`, `pack_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bon_livraison_pack_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bon_livraison_id` INTEGER NOT NULL,
    `pack_id` INTEGER NOT NULL,
    `quantity` DECIMAL(10, 3) NOT NULL,
    `prix_vente` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bon_livraison_pack_lines_bon_livraison_id_idx`(`bon_livraison_id`),
    INDEX `bon_livraison_pack_lines_pack_id_idx`(`pack_id`),
    UNIQUE INDEX `bon_livraison_pack_lines_bon_livraison_id_pack_id_key`(`bon_livraison_id`, `pack_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `client_id` INTEGER NULL,
    `client_name` VARCHAR(255) NULL,
    `document_number` VARCHAR(50) NOT NULL,
    `status` ENUM('DRAFT', 'CONFIRMED', 'PARTIAL', 'COMPLETED', 'CANCELLED', 'PAID') NOT NULL DEFAULT 'DRAFT',
    `total_ht` DECIMAL(10, 2) NOT NULL,
    `total_tva` DECIMAL(10, 2) NOT NULL,
    `total_ttc` DECIMAL(10, 2) NOT NULL,
    `discount` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `amount_paid` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `amount_due` DECIMAL(10, 2) NOT NULL,
    `notes` TEXT NULL,
    `internal_notes` TEXT NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_documents_societe_id_idx`(`societe_id`),
    INDEX `client_documents_client_id_idx`(`client_id`),
    INDEX `client_documents_status_idx`(`status`),
    INDEX `client_documents_created_by_idx`(`created_by`),
    UNIQUE INDEX `client_documents_societe_id_document_number_key`(`societe_id`, `document_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_document_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NOT NULL,
    `article_id` INTEGER NULL,
    `variant_id` INTEGER NULL,
    `line_number` INTEGER NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(10, 3) NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `remise` DECIMAL(10, 2) NULL,
    `price_field` VARCHAR(20) NULL,
    `total_ht` DECIMAL(12, 2) NULL,
    `tva_rate` DECIMAL(5, 2) NULL,
    `total_tva` DECIMAL(12, 2) NULL,
    `total_ttc` DECIMAL(12, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_document_lines_document_id_idx`(`document_id`),
    INDEX `client_document_lines_article_id_idx`(`article_id`),
    INDEX `client_document_lines_variant_id_idx`(`variant_id`),
    UNIQUE INDEX `client_document_lines_document_id_line_number_key`(`document_id`, `line_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fournisseur_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `fournisseur_id` INTEGER NOT NULL,
    `document_number` VARCHAR(50) NOT NULL,
    `status` ENUM('DRAFT', 'CONFIRMED', 'PARTIAL', 'COMPLETED', 'CANCELLED', 'PAID') NOT NULL DEFAULT 'DRAFT',
    `total_ht` DECIMAL(10, 2) NOT NULL,
    `total_tva` DECIMAL(10, 2) NOT NULL,
    `total_ttc` DECIMAL(10, 2) NOT NULL,
    `discount` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `amount_paid` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `amount_due` DECIMAL(10, 2) NOT NULL,
    `notes` TEXT NULL,
    `internal_notes` TEXT NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `fournisseur_documents_societe_id_idx`(`societe_id`),
    INDEX `fournisseur_documents_fournisseur_id_idx`(`fournisseur_id`),
    INDEX `fournisseur_documents_status_idx`(`status`),
    INDEX `fournisseur_documents_created_by_idx`(`created_by`),
    UNIQUE INDEX `fournisseur_documents_societe_id_document_number_key`(`societe_id`, `document_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fournisseur_document_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NOT NULL,
    `article_id` INTEGER NULL,
    `variant_id` INTEGER NULL,
    `line_number` INTEGER NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(10, 3) NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `discount` DECIMAL(5, 2) NULL,
    `total_ht` DECIMAL(10, 2) NULL,
    `tva_rate` DECIMAL(5, 2) NULL,
    `total_tva` DECIMAL(10, 2) NULL,
    `total_ttc` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `fournisseur_document_lines_document_id_idx`(`document_id`),
    INDEX `fournisseur_document_lines_article_id_idx`(`article_id`),
    INDEX `fournisseur_document_lines_variant_id_idx`(`variant_id`),
    UNIQUE INDEX `fournisseur_document_lines_document_id_line_number_key`(`document_id`, `line_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `devis` (
    `id` INTEGER NOT NULL,
    `document_date` DATE NOT NULL,
    `valid_until` DATE NULL,
    `payment_method` ENUM('ESPECES', 'CHEQUE', 'VIREMENT', 'CARTE', 'TRAITE', 'EFFET') NULL,
    `remise_globale` DECIMAL(5, 2) NULL,
    `conditions` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `devis_document_date_idx`(`document_date`),
    INDEX `devis_valid_until_idx`(`valid_until`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commandes` (
    `id` INTEGER NOT NULL,
    `document_date` DATE NOT NULL,
    `date_confirmation` DATE NULL,
    `date_livraison_prevue` DATE NULL,
    `payment_method` ENUM('ESPECES', 'CHEQUE', 'VIREMENT', 'CARTE', 'TRAITE', 'EFFET') NULL,
    `conditions_paiement` VARCHAR(255) NULL,
    `devis_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `commandes_document_date_idx`(`document_date`),
    INDEX `commandes_devis_id_idx`(`devis_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bon_livraisons` (
    `id` INTEGER NOT NULL,
    `document_date` DATETIME NOT NULL,
    `date_livraison` DATE NULL,
    `depot_id` INTEGER NULL,
    `delivery_id` INTEGER NULL,
    `commande_id` INTEGER NULL,
    `type` ENUM('STANDARD', 'ADVANCED') NOT NULL DEFAULT 'STANDARD',
    `command_status` ENUM('EN_COURS', 'CONFIRME', 'PREPARE', 'COLLECTE', 'EN_ROUTE', 'LIVRE', 'ANNULE', 'REPORTE', 'PAYE', 'UPDATE', 'SUSPENDED', 'CONTINUED') NULL,
    `agence_id` INTEGER NULL,
    `heure_livraison` VARCHAR(10) NULL,
    `telephone` VARCHAR(20) NULL,
    `whatsapp` VARCHAR(20) NULL,
    `ville` VARCHAR(100) NULL,
    `localisation` TEXT NULL,
    `raison_social` VARCHAR(255) NULL,
    `ice` VARCHAR(15) NULL,
    `siege_social` VARCHAR(255) NULL,
    `nombre_de_colis` INTEGER NULL,
    `observation` TEXT NULL,
    `mode_reglement` ENUM('ESPECE', 'CARTE_BANCAIRE', 'CHEQUE', 'EFFET', 'CARTE_FIDELITE', 'BON_ACHAT', 'REMISE', 'VIREMENT') NULL,
    `commercial_id` INTEGER NULL,
    `preparateur_id` INTEGER NULL,
    `livreur_id` INTEGER NULL,
    `is_reported` BOOLEAN NOT NULL DEFAULT false,
    `reported_at` DATETIME(3) NULL,
    `reported_by` INTEGER NULL,
    `report_reason` VARCHAR(500) NULL,
    `next_delivery_date` DATE NULL,
    `is_suspended` BOOLEAN NOT NULL DEFAULT false,
    `colis_tracking_number` VARCHAR(100) NULL,
    `colis_provider` VARCHAR(50) NULL,
    `colis_sync` ENUM('NOT_APPLICABLE', 'PENDING', 'CREATED', 'FAILED', 'RECEIVED') NOT NULL DEFAULT 'NOT_APPLICABLE',
    `provider_config_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `bon_livraisons_document_date_idx`(`document_date`),
    INDEX `bon_livraisons_commande_id_idx`(`commande_id`),
    INDEX `bon_livraisons_depot_id_idx`(`depot_id`),
    INDEX `bon_livraisons_delivery_id_idx`(`delivery_id`),
    INDEX `bon_livraisons_type_idx`(`type`),
    INDEX `bon_livraisons_command_status_idx`(`command_status`),
    INDEX `bon_livraisons_agence_id_idx`(`agence_id`),
    INDEX `bon_livraisons_commercial_id_idx`(`commercial_id`),
    INDEX `bon_livraisons_preparateur_id_idx`(`preparateur_id`),
    INDEX `bon_livraisons_livreur_id_idx`(`livreur_id`),
    INDEX `bon_livraisons_is_reported_idx`(`is_reported`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bon_livraison_advances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bon_livraison_id` INTEGER NOT NULL,
    `advance_id` INTEGER NOT NULL,
    `amount_applied` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bon_livraison_advances_advance_id_idx`(`advance_id`),
    UNIQUE INDEX `bon_livraison_advances_bon_livraison_id_advance_id_key`(`bon_livraison_id`, `advance_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ameex_webhook_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tracking_code` VARCHAR(100) NOT NULL,
    `ameex_status` VARCHAR(50) NOT NULL,
    `raw_payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `processed_at` DATETIME(3) NULL,
    `error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ameex_webhook_logs_tracking_code_idx`(`tracking_code`),
    INDEX `ameex_webhook_logs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bon_livraison_status_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bon_id` INTEGER NOT NULL,
    `status` ENUM('EN_COURS', 'CONFIRME', 'PREPARE', 'COLLECTE', 'EN_ROUTE', 'LIVRE', 'ANNULE', 'REPORTE', 'PAYE', 'UPDATE', 'SUSPENDED', 'CONTINUED') NOT NULL,
    `note` VARCHAR(500) NULL,
    `user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bon_livraison_status_history_bon_id_created_at_idx`(`bon_id`, `created_at`),
    INDEX `bon_livraison_status_history_user_id_idx`(`user_id`),
    INDEX `bon_livraison_status_history_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bon_retour_clients` (
    `id` INTEGER NOT NULL,
    `document_date` DATETIME NOT NULL,
    `date_retour` DATE NULL,
    `depot_id` INTEGER NULL,
    `motif_retour` VARCHAR(500) NULL,
    `bon_livraison_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `bon_retour_clients_document_date_idx`(`document_date`),
    INDEX `bon_retour_clients_bon_livraison_id_idx`(`bon_livraison_id`),
    INDEX `bon_retour_clients_depot_id_idx`(`depot_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `factures` (
    `id` INTEGER NOT NULL,
    `document_date` DATE NOT NULL,
    `date_echeance` DATE NULL,
    `payment_method` ENUM('ESPECES', 'CHEQUE', 'VIREMENT', 'CARTE', 'TRAITE', 'EFFET') NULL,
    `penalites_retard` DECIMAL(5, 2) NULL,
    `conditions_paiement` VARCHAR(255) NULL,
    `bon_livraison_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `factures_document_date_idx`(`document_date`),
    INDEX `factures_date_echeance_idx`(`date_echeance`),
    INDEX `factures_bon_livraison_id_idx`(`bon_livraison_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `avoirs` (
    `id` INTEGER NOT NULL,
    `document_date` DATE NOT NULL,
    `motif` VARCHAR(500) NULL,
    `payment_method` ENUM('ESPECES', 'CHEQUE', 'VIREMENT', 'CARTE', 'TRAITE', 'EFFET') NULL,
    `facture_id` INTEGER NULL,
    `bon_retour_client_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `avoirs_document_date_idx`(`document_date`),
    INDEX `avoirs_facture_id_idx`(`facture_id`),
    INDEX `avoirs_bon_retour_client_id_idx`(`bon_retour_client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bon_receptions` (
    `id` INTEGER NOT NULL,
    `document_date` DATE NOT NULL,
    `date_reception` DATETIME NULL,
    `depot_id` INTEGER NULL,
    `document_reference` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `bon_receptions_document_date_idx`(`document_date`),
    INDEX `bon_receptions_depot_id_idx`(`depot_id`),
    INDEX `bon_receptions_document_reference_idx`(`document_reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bon_retour_fournisseurs` (
    `id` INTEGER NOT NULL,
    `document_date` DATE NOT NULL,
    `depot_id` INTEGER NULL,
    `motif_retour` VARCHAR(500) NULL,
    `bon_reception_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `bon_retour_fournisseurs_document_date_idx`(`document_date`),
    INDEX `bon_retour_fournisseurs_bon_reception_id_idx`(`bon_reception_id`),
    INDEX `bon_retour_fournisseurs_depot_id_idx`(`depot_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `avoir_fournisseurs` (
    `id` INTEGER NOT NULL,
    `document_date` DATE NOT NULL,
    `motif` VARCHAR(500) NULL,
    `payment_method` ENUM('ESPECES', 'CHEQUE', 'VIREMENT', 'CARTE', 'TRAITE', 'EFFET') NULL,
    `bon_retour_fournisseur_id` INTEGER NULL,
    `bon_reception_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `avoir_fournisseurs_document_date_idx`(`document_date`),
    INDEX `avoir_fournisseurs_bon_retour_fournisseur_id_idx`(`bon_retour_fournisseur_id`),
    INDEX `avoir_fournisseurs_bon_reception_id_idx`(`bon_reception_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payment_type` ENUM('CLIENT', 'FOURNISSEUR') NOT NULL,
    `facture_id` INTEGER NULL,
    `avoir_id` INTEGER NULL,
    `bon_reception_id` INTEGER NULL,
    `avoir_fournisseur_id` INTEGER NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` ENUM('ESPECES', 'CHEQUE', 'VIREMENT', 'CARTE', 'TRAITE', 'EFFET') NOT NULL,
    `payment_date` DATE NOT NULL,
    `reference` VARCHAR(100) NULL,
    `bank_account` VARCHAR(50) NULL,
    `notes` TEXT NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payments_facture_id_idx`(`facture_id`),
    INDEX `payments_avoir_id_idx`(`avoir_id`),
    INDEX `payments_bon_reception_id_idx`(`bon_reception_id`),
    INDEX `payments_avoir_fournisseur_id_idx`(`avoir_fournisseur_id`),
    INDEX `payments_payment_date_idx`(`payment_date`),
    INDEX `payments_payment_type_idx`(`payment_type`),
    INDEX `payments_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `depot_id` INTEGER NOT NULL,
    `article_id` INTEGER NULL,
    `variant_id` INTEGER NULL,
    `transaction_type` ENUM('INBOUND', 'OUTBOUND', 'RETURN_IN', 'RETURN_OUT', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'DAMAGED') NOT NULL,
    `quantity_change` DECIMAL(10, 3) NOT NULL,
    `quantity_after` DECIMAL(10, 3) NOT NULL,
    `reason` TEXT NULL,
    `reference_id` VARCHAR(100) NULL,
    `created_by` INTEGER NULL,
    `transfer_id` INTEGER NULL,
    `inventory_id` INTEGER NULL,
    `bon_livraison_id` INTEGER NULL,
    `bon_retour_client_id` INTEGER NULL,
    `bon_reception_id` INTEGER NULL,
    `bon_retour_fournisseur_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_transactions_depot_id_idx`(`depot_id`),
    INDEX `stock_transactions_article_id_idx`(`article_id`),
    INDEX `stock_transactions_variant_id_idx`(`variant_id`),
    INDEX `stock_transactions_transaction_type_idx`(`transaction_type`),
    INDEX `stock_transactions_created_at_idx`(`created_at`),
    INDEX `stock_transactions_created_by_idx`(`created_by`),
    INDEX `stock_transactions_reference_id_idx`(`reference_id`),
    INDEX `stock_transactions_transfer_id_idx`(`transfer_id`),
    INDEX `stock_transactions_inventory_id_idx`(`inventory_id`),
    INDEX `stock_transactions_bon_livraison_id_idx`(`bon_livraison_id`),
    INDEX `stock_transactions_bon_retour_client_id_idx`(`bon_retour_client_id`),
    INDEX `stock_transactions_bon_reception_id_idx`(`bon_reception_id`),
    INDEX `stock_transactions_bon_retour_fournisseur_id_idx`(`bon_retour_fournisseur_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_reservations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `depot_id` INTEGER NOT NULL,
    `article_id` INTEGER NULL,
    `variant_id` INTEGER NULL,
    `order_id` VARCHAR(100) NOT NULL,
    `quantity_reserved` DECIMAL(10, 3) NOT NULL,
    `status` ENUM('PENDING', 'FULFILLED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `stock_reservations_depot_id_idx`(`depot_id`),
    INDEX `stock_reservations_article_id_idx`(`article_id`),
    INDEX `stock_reservations_variant_id_idx`(`variant_id`),
    INDEX `stock_reservations_order_id_idx`(`order_id`),
    INDEX `stock_reservations_status_idx`(`status`),
    INDEX `stock_reservations_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_transfers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `transfer_number` VARCHAR(50) NOT NULL,
    `source_depot_id` INTEGER NOT NULL,
    `destination_depot_id` INTEGER NOT NULL,
    `transfer_date` DATE NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `created_by` INTEGER NULL,
    `validated_by` INTEGER NULL,
    `validated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `stock_transfers_societe_id_idx`(`societe_id`),
    INDEX `stock_transfers_source_depot_id_idx`(`source_depot_id`),
    INDEX `stock_transfers_destination_depot_id_idx`(`destination_depot_id`),
    INDEX `stock_transfers_status_idx`(`status`),
    INDEX `stock_transfers_transfer_date_idx`(`transfer_date`),
    INDEX `stock_transfers_created_by_idx`(`created_by`),
    UNIQUE INDEX `stock_transfers_societe_id_transfer_number_key`(`societe_id`, `transfer_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_transfer_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transfer_id` INTEGER NOT NULL,
    `article_id` INTEGER NULL,
    `variant_id` INTEGER NULL,
    `line_number` INTEGER NOT NULL,
    `quantity_received` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `stock_transfer_lines_transfer_id_idx`(`transfer_id`),
    INDEX `stock_transfer_lines_article_id_idx`(`article_id`),
    INDEX `stock_transfer_lines_variant_id_idx`(`variant_id`),
    UNIQUE INDEX `stock_transfer_lines_transfer_id_line_number_key`(`transfer_id`, `line_number`),
    UNIQUE INDEX `stock_transfer_lines_transfer_id_article_id_key`(`transfer_id`, `article_id`),
    UNIQUE INDEX `stock_transfer_lines_transfer_id_variant_id_key`(`transfer_id`, `variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `depot_id` INTEGER NOT NULL,
    `inventory_number` VARCHAR(50) NOT NULL,
    `inventory_date` DATE NOT NULL,
    `notes` TEXT NULL,
    `gap` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `created_by` INTEGER NULL,
    `validated_by` INTEGER NULL,
    `validated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `inventories_societe_id_idx`(`societe_id`),
    INDEX `inventories_depot_id_idx`(`depot_id`),
    INDEX `inventories_inventory_date_idx`(`inventory_date`),
    INDEX `inventories_created_by_idx`(`created_by`),
    UNIQUE INDEX `inventories_societe_id_inventory_number_key`(`societe_id`, `inventory_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventory_id` INTEGER NOT NULL,
    `article_id` INTEGER NULL,
    `variant_id` INTEGER NULL,
    `line_number` INTEGER NOT NULL,
    `quantity_theoretical` DECIMAL(10, 3) NOT NULL,
    `quantity_counted` DECIMAL(10, 3) NOT NULL,
    `quantity_difference` DECIMAL(10, 3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `inventory_lines_inventory_id_idx`(`inventory_id`),
    INDEX `inventory_lines_article_id_idx`(`article_id`),
    INDEX `inventory_lines_variant_id_idx`(`variant_id`),
    UNIQUE INDEX `inventory_lines_inventory_id_line_number_key`(`inventory_id`, `line_number`),
    UNIQUE INDEX `inventory_lines_inventory_id_article_id_key`(`inventory_id`, `article_id`),
    UNIQUE INDEX `inventory_lines_inventory_id_variant_id_key`(`inventory_id`, `variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reglement_clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `date` DATETIME NOT NULL,
    `client_id` INTEGER NOT NULL,
    `mode_reglement` ENUM('ESPECE', 'CARTE_BANCAIRE', 'CHEQUE', 'EFFET', 'CARTE_FIDELITE', 'BON_ACHAT', 'REMISE', 'VIREMENT') NOT NULL,
    `document_numbers` JSON NULL,
    `payment_breakdown` JSON NULL,
    `montant_regle` DECIMAL(10, 2) NOT NULL,
    `montant_bl` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `solde` DECIMAL(10, 2) NOT NULL,
    `ref_document` VARCHAR(255) NULL,
    `date_echeance` DATE NULL,
    `banque_id` INTEGER NULL,
    `avance_id` INTEGER NULL,
    `avance_consumed` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reglement_clients_societe_id_idx`(`societe_id`),
    INDEX `reglement_clients_client_id_idx`(`client_id`),
    INDEX `reglement_clients_date_idx`(`date`),
    INDEX `reglement_clients_banque_id_idx`(`banque_id`),
    INDEX `reglement_clients_avance_id_idx`(`avance_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reglement_fournisseurs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societe_id` INTEGER NOT NULL,
    `date` DATETIME NOT NULL,
    `fournisseur_id` INTEGER NOT NULL,
    `mode_reglement` ENUM('ESPECE', 'CARTE_BANCAIRE', 'CHEQUE', 'EFFET', 'CARTE_FIDELITE', 'BON_ACHAT', 'REMISE', 'VIREMENT') NOT NULL,
    `document_numbers` JSON NULL,
    `payment_breakdown` JSON NULL,
    `montant_regle` DECIMAL(10, 2) NOT NULL,
    `montant_br` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `solde` DECIMAL(10, 2) NOT NULL,
    `ref_document` VARCHAR(255) NULL,
    `date_echeance` DATE NULL,
    `banque_id` INTEGER NULL,
    `avance_id` INTEGER NULL,
    `avance_consumed` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reglement_fournisseurs_societe_id_idx`(`societe_id`),
    INDEX `reglement_fournisseurs_fournisseur_id_idx`(`fournisseur_id`),
    INDEX `reglement_fournisseurs_date_idx`(`date`),
    INDEX `reglement_fournisseurs_banque_id_idx`(`banque_id`),
    INDEX `reglement_fournisseurs_avance_id_idx`(`avance_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bon_reception_advances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bon_reception_id` INTEGER NOT NULL,
    `advance_id` INTEGER NOT NULL,
    `amount_applied` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bon_reception_advances_advance_id_idx`(`advance_id`),
    UNIQUE INDEX `bon_reception_advances_bon_reception_id_advance_id_key`(`bon_reception_id`, `advance_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `caisse_labels` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `caisse_labels_name_key`(`name`),
    INDEX `caisse_labels_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `caisses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `societe_id` INTEGER NULL,
    `caisse_type` ENUM('CENTRAL', 'SOCIETE', 'USER') NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `initial_balance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `current_balance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `caisses_user_id_key`(`user_id`),
    INDEX `caisses_societe_id_idx`(`societe_id`),
    INDEX `caisses_caisse_type_idx`(`caisse_type`),
    INDEX `caisses_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `caisse_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `caisse_id` INTEGER NOT NULL,
    `transaction_type` ENUM('INITIAL_BALANCE', 'CHARGE', 'TRANSFER_IN', 'TRANSFER_OUT') NOT NULL,
    `label_id` INTEGER NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `old_balance` DECIMAL(10, 2) NOT NULL,
    `new_balance` DECIMAL(10, 2) NOT NULL,
    `note` TEXT NULL,
    `reference_caisse_id` INTEGER NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `caisse_transactions_caisse_id_idx`(`caisse_id`),
    INDEX `caisse_transactions_transaction_type_idx`(`transaction_type`),
    INDEX `caisse_transactions_label_id_idx`(`label_id`),
    INDEX `caisse_transactions_created_at_idx`(`created_at`),
    INDEX `caisse_transactions_created_by_idx`(`created_by`),
    INDEX `caisse_transactions_reference_caisse_id_idx`(`reference_caisse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `delivery_provider_configs` ADD CONSTRAINT `delivery_provider_configs_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `depots` ADD CONSTRAINT `depots_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_by_depot` ADD CONSTRAINT `stock_by_depot_depot_id_fkey` FOREIGN KEY (`depot_id`) REFERENCES `depots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_by_depot` ADD CONSTRAINT `stock_by_depot_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_by_depot` ADD CONSTRAINT `stock_by_depot_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `article_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settings_change_log` ADD CONSTRAINT `settings_change_log_changedBy_fkey` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_extra_permissions` ADD CONSTRAINT `user_extra_permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_extra_permissions` ADD CONSTRAINT `user_extra_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_removed_permissions` ADD CONSTRAINT `user_removed_permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_removed_permissions` ADD CONSTRAINT `user_removed_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `families` ADD CONSTRAINT `families_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attribute_values` ADD CONSTRAINT `attribute_values_attribute_id_fkey` FOREIGN KEY (`attribute_id`) REFERENCES `attributes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `articles` ADD CONSTRAINT `articles_unite_principale_id_fkey` FOREIGN KEY (`unite_principale_id`) REFERENCES `units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `articles` ADD CONSTRAINT `articles_unite_secondaire_id_fkey` FOREIGN KEY (`unite_secondaire_id`) REFERENCES `units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `articles` ADD CONSTRAINT `articles_unite_complementaire_id_fkey` FOREIGN KEY (`unite_complementaire_id`) REFERENCES `units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `articles` ADD CONSTRAINT `articles_family_id_fkey` FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_variants` ADD CONSTRAINT `article_variants_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `variant_attributes` ADD CONSTRAINT `variant_attributes_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `article_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `variant_attributes` ADD CONSTRAINT `variant_attributes_attribute_id_fkey` FOREIGN KEY (`attribute_id`) REFERENCES `attributes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `variant_attributes` ADD CONSTRAINT `variant_attributes_attribute_value_id_fkey` FOREIGN KEY (`attribute_value_id`) REFERENCES `attribute_values`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `societe_pricing` ADD CONSTRAINT `societe_pricing_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `societe_pricing` ADD CONSTRAINT `societe_pricing_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `societe_pricing` ADD CONSTRAINT `societe_pricing_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `article_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fournisseurs` ADD CONSTRAINT `fournisseurs_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agences` ADD CONSTRAINT `agences_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packs` ADD CONSTRAINT `packs_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pack_components` ADD CONSTRAINT `pack_components_pack_id_fkey` FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pack_components` ADD CONSTRAINT `pack_components_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pack_components` ADD CONSTRAINT `pack_components_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `article_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_retour_client_pack_lines` ADD CONSTRAINT `bon_retour_client_pack_lines_bon_retour_client_id_fkey` FOREIGN KEY (`bon_retour_client_id`) REFERENCES `bon_retour_clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_retour_client_pack_lines` ADD CONSTRAINT `bon_retour_client_pack_lines_pack_id_fkey` FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraison_pack_lines` ADD CONSTRAINT `bon_livraison_pack_lines_bon_livraison_id_fkey` FOREIGN KEY (`bon_livraison_id`) REFERENCES `bon_livraisons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraison_pack_lines` ADD CONSTRAINT `bon_livraison_pack_lines_pack_id_fkey` FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_documents` ADD CONSTRAINT `client_documents_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_documents` ADD CONSTRAINT `client_documents_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_documents` ADD CONSTRAINT `client_documents_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_document_lines` ADD CONSTRAINT `client_document_lines_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `client_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_document_lines` ADD CONSTRAINT `client_document_lines_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_document_lines` ADD CONSTRAINT `client_document_lines_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `article_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fournisseur_documents` ADD CONSTRAINT `fournisseur_documents_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fournisseur_documents` ADD CONSTRAINT `fournisseur_documents_fournisseur_id_fkey` FOREIGN KEY (`fournisseur_id`) REFERENCES `fournisseurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fournisseur_documents` ADD CONSTRAINT `fournisseur_documents_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fournisseur_document_lines` ADD CONSTRAINT `fournisseur_document_lines_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `fournisseur_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fournisseur_document_lines` ADD CONSTRAINT `fournisseur_document_lines_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fournisseur_document_lines` ADD CONSTRAINT `fournisseur_document_lines_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `article_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `devis` ADD CONSTRAINT `devis_id_fkey` FOREIGN KEY (`id`) REFERENCES `client_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commandes` ADD CONSTRAINT `commandes_devis_id_fkey` FOREIGN KEY (`devis_id`) REFERENCES `devis`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commandes` ADD CONSTRAINT `commandes_id_fkey` FOREIGN KEY (`id`) REFERENCES `client_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraisons` ADD CONSTRAINT `bon_livraisons_commande_id_fkey` FOREIGN KEY (`commande_id`) REFERENCES `commandes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraisons` ADD CONSTRAINT `bon_livraisons_id_fkey` FOREIGN KEY (`id`) REFERENCES `client_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraisons` ADD CONSTRAINT `bon_livraisons_depot_id_fkey` FOREIGN KEY (`depot_id`) REFERENCES `depots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraisons` ADD CONSTRAINT `bon_livraisons_delivery_id_fkey` FOREIGN KEY (`delivery_id`) REFERENCES `deliveries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraisons` ADD CONSTRAINT `bon_livraisons_agence_id_fkey` FOREIGN KEY (`agence_id`) REFERENCES `agences`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraisons` ADD CONSTRAINT `bon_livraisons_commercial_id_fkey` FOREIGN KEY (`commercial_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraisons` ADD CONSTRAINT `bon_livraisons_preparateur_id_fkey` FOREIGN KEY (`preparateur_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraisons` ADD CONSTRAINT `bon_livraisons_livreur_id_fkey` FOREIGN KEY (`livreur_id`) REFERENCES `deliveries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraisons` ADD CONSTRAINT `bon_livraisons_reported_by_fkey` FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraisons` ADD CONSTRAINT `bon_livraisons_provider_config_id_fkey` FOREIGN KEY (`provider_config_id`) REFERENCES `delivery_provider_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraison_advances` ADD CONSTRAINT `bon_livraison_advances_bon_livraison_id_fkey` FOREIGN KEY (`bon_livraison_id`) REFERENCES `bon_livraisons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraison_advances` ADD CONSTRAINT `bon_livraison_advances_advance_id_fkey` FOREIGN KEY (`advance_id`) REFERENCES `reglement_clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraison_status_history` ADD CONSTRAINT `bon_livraison_status_history_bon_id_fkey` FOREIGN KEY (`bon_id`) REFERENCES `bon_livraisons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_livraison_status_history` ADD CONSTRAINT `bon_livraison_status_history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_retour_clients` ADD CONSTRAINT `bon_retour_clients_bon_livraison_id_fkey` FOREIGN KEY (`bon_livraison_id`) REFERENCES `bon_livraisons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_retour_clients` ADD CONSTRAINT `bon_retour_clients_id_fkey` FOREIGN KEY (`id`) REFERENCES `client_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_retour_clients` ADD CONSTRAINT `bon_retour_clients_depot_id_fkey` FOREIGN KEY (`depot_id`) REFERENCES `depots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `factures` ADD CONSTRAINT `factures_bon_livraison_id_fkey` FOREIGN KEY (`bon_livraison_id`) REFERENCES `bon_livraisons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `factures` ADD CONSTRAINT `factures_id_fkey` FOREIGN KEY (`id`) REFERENCES `client_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avoirs` ADD CONSTRAINT `avoirs_facture_id_fkey` FOREIGN KEY (`facture_id`) REFERENCES `factures`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avoirs` ADD CONSTRAINT `avoirs_bon_retour_client_id_fkey` FOREIGN KEY (`bon_retour_client_id`) REFERENCES `bon_retour_clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avoirs` ADD CONSTRAINT `avoirs_id_fkey` FOREIGN KEY (`id`) REFERENCES `client_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_receptions` ADD CONSTRAINT `bon_receptions_id_fkey` FOREIGN KEY (`id`) REFERENCES `fournisseur_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_receptions` ADD CONSTRAINT `bon_receptions_depot_id_fkey` FOREIGN KEY (`depot_id`) REFERENCES `depots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_retour_fournisseurs` ADD CONSTRAINT `bon_retour_fournisseurs_bon_reception_id_fkey` FOREIGN KEY (`bon_reception_id`) REFERENCES `bon_receptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_retour_fournisseurs` ADD CONSTRAINT `bon_retour_fournisseurs_id_fkey` FOREIGN KEY (`id`) REFERENCES `fournisseur_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_retour_fournisseurs` ADD CONSTRAINT `bon_retour_fournisseurs_depot_id_fkey` FOREIGN KEY (`depot_id`) REFERENCES `depots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avoir_fournisseurs` ADD CONSTRAINT `avoir_fournisseurs_bon_retour_fournisseur_id_fkey` FOREIGN KEY (`bon_retour_fournisseur_id`) REFERENCES `bon_retour_fournisseurs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avoir_fournisseurs` ADD CONSTRAINT `avoir_fournisseurs_bon_reception_id_fkey` FOREIGN KEY (`bon_reception_id`) REFERENCES `bon_receptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avoir_fournisseurs` ADD CONSTRAINT `avoir_fournisseurs_id_fkey` FOREIGN KEY (`id`) REFERENCES `fournisseur_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_facture_id_fkey` FOREIGN KEY (`facture_id`) REFERENCES `factures`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_avoir_id_fkey` FOREIGN KEY (`avoir_id`) REFERENCES `avoirs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_bon_reception_id_fkey` FOREIGN KEY (`bon_reception_id`) REFERENCES `bon_receptions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_avoir_fournisseur_id_fkey` FOREIGN KEY (`avoir_fournisseur_id`) REFERENCES `avoir_fournisseurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_depot_id_fkey` FOREIGN KEY (`depot_id`) REFERENCES `depots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `article_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_transfer_id_fkey` FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_inventory_id_fkey` FOREIGN KEY (`inventory_id`) REFERENCES `inventories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_bon_livraison_id_fkey` FOREIGN KEY (`bon_livraison_id`) REFERENCES `bon_livraisons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_bon_retour_client_id_fkey` FOREIGN KEY (`bon_retour_client_id`) REFERENCES `bon_retour_clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_bon_reception_id_fkey` FOREIGN KEY (`bon_reception_id`) REFERENCES `bon_receptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transactions` ADD CONSTRAINT `stock_transactions_bon_retour_fournisseur_id_fkey` FOREIGN KEY (`bon_retour_fournisseur_id`) REFERENCES `bon_retour_fournisseurs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_depot_id_fkey` FOREIGN KEY (`depot_id`) REFERENCES `depots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `article_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_source_depot_id_fkey` FOREIGN KEY (`source_depot_id`) REFERENCES `depots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_destination_depot_id_fkey` FOREIGN KEY (`destination_depot_id`) REFERENCES `depots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_validated_by_fkey` FOREIGN KEY (`validated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfer_lines` ADD CONSTRAINT `stock_transfer_lines_transfer_id_fkey` FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfer_lines` ADD CONSTRAINT `stock_transfer_lines_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_transfer_lines` ADD CONSTRAINT `stock_transfer_lines_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `article_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventories` ADD CONSTRAINT `inventories_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventories` ADD CONSTRAINT `inventories_depot_id_fkey` FOREIGN KEY (`depot_id`) REFERENCES `depots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventories` ADD CONSTRAINT `inventories_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventories` ADD CONSTRAINT `inventories_validated_by_fkey` FOREIGN KEY (`validated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_lines` ADD CONSTRAINT `inventory_lines_inventory_id_fkey` FOREIGN KEY (`inventory_id`) REFERENCES `inventories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_lines` ADD CONSTRAINT `inventory_lines_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_lines` ADD CONSTRAINT `inventory_lines_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `article_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reglement_clients` ADD CONSTRAINT `reglement_clients_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reglement_clients` ADD CONSTRAINT `reglement_clients_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reglement_clients` ADD CONSTRAINT `reglement_clients_banque_id_fkey` FOREIGN KEY (`banque_id`) REFERENCES `banques`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reglement_clients` ADD CONSTRAINT `reglement_clients_avance_id_fkey` FOREIGN KEY (`avance_id`) REFERENCES `reglement_clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reglement_fournisseurs` ADD CONSTRAINT `reglement_fournisseurs_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reglement_fournisseurs` ADD CONSTRAINT `reglement_fournisseurs_fournisseur_id_fkey` FOREIGN KEY (`fournisseur_id`) REFERENCES `fournisseurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reglement_fournisseurs` ADD CONSTRAINT `reglement_fournisseurs_banque_id_fkey` FOREIGN KEY (`banque_id`) REFERENCES `banques`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reglement_fournisseurs` ADD CONSTRAINT `reglement_fournisseurs_avance_id_fkey` FOREIGN KEY (`avance_id`) REFERENCES `reglement_fournisseurs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_reception_advances` ADD CONSTRAINT `bon_reception_advances_bon_reception_id_fkey` FOREIGN KEY (`bon_reception_id`) REFERENCES `bon_receptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_reception_advances` ADD CONSTRAINT `bon_reception_advances_advance_id_fkey` FOREIGN KEY (`advance_id`) REFERENCES `reglement_fournisseurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisses` ADD CONSTRAINT `caisses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisses` ADD CONSTRAINT `caisses_societe_id_fkey` FOREIGN KEY (`societe_id`) REFERENCES `societes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisse_transactions` ADD CONSTRAINT `caisse_transactions_caisse_id_fkey` FOREIGN KEY (`caisse_id`) REFERENCES `caisses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisse_transactions` ADD CONSTRAINT `caisse_transactions_label_id_fkey` FOREIGN KEY (`label_id`) REFERENCES `caisse_labels`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisse_transactions` ADD CONSTRAINT `caisse_transactions_reference_caisse_id_fkey` FOREIGN KEY (`reference_caisse_id`) REFERENCES `caisses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caisse_transactions` ADD CONSTRAINT `caisse_transactions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
