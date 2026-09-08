-- Drop livreur delivery-shift tables and related permissions.

DROP TABLE IF EXISTS `delivery_shift_orders`;
DROP TABLE IF EXISTS `delivery_shifts`;

DELETE rp FROM `role_permissions` rp
INNER JOIN `permissions` p ON p.id = rp.permission_id
WHERE p.name IN ('view_delivery_shifts', 'manage_delivery_shifts');

DELETE uep FROM `user_extra_permissions` uep
INNER JOIN `permissions` p ON p.id = uep.permission_id
WHERE p.name IN ('view_delivery_shifts', 'manage_delivery_shifts');

DELETE urp FROM `user_removed_permissions` urp
INNER JOIN `permissions` p ON p.id = urp.permission_id
WHERE p.name IN ('view_delivery_shifts', 'manage_delivery_shifts');

DELETE FROM `permissions`
WHERE `name` IN ('view_delivery_shifts', 'manage_delivery_shifts');
