import express from "express";
import loaders from "./loaders/index.js";
import cors from "cors";
import path from "path";

const app = express();
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean)
  : ["http://localhost:5173", "http://localhost:4173"];

const LAN_HOST =
  /^(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})$/;
const LAN_PORTS = new Set(["", "80", "443", "3000", "4173", "5173", "5174"]);

const isAllowedOrigin = (origin) => {
  if (!origin || origin === "null" || origin === "file://") return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return LAN_HOST.test(url.hostname) && LAN_PORTS.has(url.port);
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

await loaders({ app });

export default app;
