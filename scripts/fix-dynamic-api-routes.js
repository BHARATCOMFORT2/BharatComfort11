// scripts/fix-dynamic-api-routes.js
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "app", "api");

let updated = 0;
let skipped = 0;

function walk(dir, cb) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) walk(fullPath, cb);
    else cb(fullPath);
  });
}

function patchFile(filePath) {
  if (!filePath.endsWith("route.ts") && !filePath.endsWith("route.js")) return;

  let content = fs.readFileSync(filePath, "utf8");
  if (content.includes('export const dynamic = "force-dynamic"')) {
    skipped++;
    return;
  }

  const newContent =
    `export const runtime = "nodejs";\nexport const dynamic = "force-dynamic";\n\n` +
    content;
  fs.writeFileSync(filePath, newContent, "utf8");
  updated++;
  console.log("✅ Patched:", filePath.replace(ROOT, ""));
}

if (fs.existsSync(API_DIR)) {
  console.log("🔍 Scanning /app/api routes...");
  walk(API_DIR, patchFile);
  console.log(`\n✅ Done. ${updated} routes patched, ${skipped} already correct.`);
} else {
  console.log("❌ /app/api directory not found.");
}
