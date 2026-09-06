-- Extra operational roles so a user can be selected as préparateur / livreur
-- on orders without changing their main RBAC role.

ALTER TABLE `users`
  ADD COLUMN `can_be_preparateur` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `can_be_livreur` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `users_can_be_preparateur_idx` ON `users`(`can_be_preparateur`);
CREATE INDEX `users_can_be_livreur_idx` ON `users`(`can_be_livreur`);

-- Backfill from the main role
UPDATE `users` u
INNER JOIN `roles` r ON u.`role_id` = r.`id`
SET u.`can_be_preparateur` = true
WHERE r.`name` = 'Preparateur';

UPDATE `users` u
INNER JOIN `roles` r ON u.`role_id` = r.`id`
SET u.`can_be_livreur` = true
WHERE r.`name` = 'Livreur';
