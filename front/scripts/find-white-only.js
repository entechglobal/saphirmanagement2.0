const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "src");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const samples = [];
let whiteOnly = 0;
const leftover = [];

for (const file of walk(root)) {
  const lines = fs.readFileSync(file, "utf8").split(/\n/);
  lines.forEach((line, i) => {
    const rel = path.relative(root, file);
    if (
      /dark:bg-slate-|dark:bg-gray-|dark:border-slate-|dark:border-gray-|#1f2937|#1e293b|#111827|#334155|#172033/.test(
        line
      )
    ) {
      leftover.push(`${rel}:${i + 1} ${line.trim().slice(0, 160)}`);
    }
    if (!line.includes("bg-white")) return;
    if (line.includes("dark:bg-")) return;
    if (line.includes("print:")) return;
    if (line.includes("bg-white/")) return;
    whiteOnly++;
    if (samples.length < 40) {
      samples.push(`${rel}:${i + 1} ${line.trim().slice(0, 160)}`);
    }
  });
}

console.log("=== leftover slate/blue dark tokens ===");
console.log(leftover.length ? leftover.join("\n") : "(none)");
console.log("\n=== bg-white without dark:bg on same line ===", whiteOnly);
console.log(samples.join("\n"));
