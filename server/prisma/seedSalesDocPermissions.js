/**
 * Upsert new sales-document permissions (commande / devis / facture).
 * Run: node prisma/seedSalesDocPermissions.js
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMS = [
  "view_commande",
  "create_commande",
  "update_commande",
  "delete_commande",
  "view_devis",
  "create_devis",
  "update_devis",
  "delete_devis",
  "view_facture",
  "create_facture",
  "update_facture",
  "delete_facture",
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

  // Attach to Societe_Admin role if it exists
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
