-- Add document header branding config on societes (MySQL)
ALTER TABLE `societes`
  ADD COLUMN `document_header_config` JSON NULL
  AFTER `fixed_structure`;
