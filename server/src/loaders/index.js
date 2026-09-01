import expressLoader from "./express.js";
// import prisma from "./prisma.js";
export default async ({ app }) => {
  // await prisma.$connect();
  expressLoader(app);
};
