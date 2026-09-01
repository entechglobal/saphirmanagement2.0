import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
});

export default prisma;
