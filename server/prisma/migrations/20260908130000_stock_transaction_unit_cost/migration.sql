-- Store the purchase cost of each stock movement so remaining quantity
-- can be valued per lot (qty × that reception's bought price).
ALTER TABLE `stock_transactions`
  ADD COLUMN `unit_cost` DECIMAL(10, 2) NULL;
