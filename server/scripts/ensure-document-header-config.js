import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

try {
  const rows = await p.$queryRawUnsafe(
    "SHOW COLUMNS FROM societes LIKE 'document_header_config'",
  );
  console.log("EXISTS", JSON.stringify(rows));
  if (!rows.length) {
    await p.$executeRawUnsafe(
      "ALTER TABLE societes ADD COLUMN document_header_config JSON NULL",
    );
    console.log("ADDED");
  }
} catch (e) {
  console.error("ERR", e.message);
  process.exitCode = 1;
} finally {
  await p.$disconnect();
}
