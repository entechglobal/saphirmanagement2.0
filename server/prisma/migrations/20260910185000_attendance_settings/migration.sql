-- Per-société standard work hours and late/overtime amount rule
ALTER TABLE `societes`
  ADD COLUMN `attendance_settings` JSON NULL
  AFTER `document_header_config`;
