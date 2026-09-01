import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "src", "shared", "components", "ReusableTable.jsx");
const content = String.raw`PLACEHOLDER`;
fs.writeFileSync(out, content.replace(/^PLACEHOLDER$/m, "").trimStart() || content, "utf8");
console.log("Wrote", out, fs.statSync(out).size);
