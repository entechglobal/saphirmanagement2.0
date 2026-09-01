/**
 * Upsert achats permissions (commande fournisseur + bon retour fournisseur).
 * Run: node prisma/seedAchatsPermissions.js
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMS = [
  "view_commande_fournisseur",
  "create_commande_fournisseur",
  "update_commande_fournisseur",
  "delete_commande_fournisseur",
  "view_bon_retour_fournisseur",
  "create_bon_retour_fournisseur",
  "update_bon_retour_fournisseur",
  "delete_bon_retour_fournisseur",
  "validate_bon_retour_fournisseur",
];

async function main() {
  for (const name of PERMS) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log("✓", name);
  }

  const role = await prisma.role.findFirst({
    where: { name: "Societe_Admin" },
  });
  if (role) {
    for (const name of PERMS) {
      const perm = await prisma.permission.findUnique({ where: { name } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
    console.log("✓ attached to Societe_Admin");
  } else {
    console.log("ℹ Societe_Admin role not found — permissions created only");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
