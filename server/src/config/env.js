import dotenv from "dotenv";
dotenv.config({ path: ".env" });

export default {
  port: process.env.PORT,
  dbUri: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
};
