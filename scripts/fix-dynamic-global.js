/**
 * 🚀 Global Fix Script — Forces All API Routes to Dynamic Node.js Runtime
 *
 * This script injects:
 *   export const runtime = "nodejs";
 *   export const dynamic = "force-dynamic";
 *
 * into every `app/api/**/*.ts` or `.js` file BEFORE Netlify builds.
 * It automatically skips duplicates and logs affected routes.
 */

import fs from "fs";
import path from "path";

const apiDir = path.join(process.cwd(), "app", "api");

function injectDynamicHeader(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  if (
    content.includes("export const runtime") ||
    content.includes("export const dynamic")
  ) {
    console.log("✅ Already dynamic:", filePath);
    return;
  }

  const header = `export const runtime = "nodejs";
export const dynamic = "force-dynamic";

`;

  fs.writeFileSync(filePath, header + content, "utf8");
  console.log("🩵 Fixed:", filePath);
}

function walk(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) walk(fullPath);
    else if (/\.(ts|js)$/.test(item)) injectDynamicHeader(fullPath);
  }
}

console.log("🧩 Scanning app/api for static routes...");
walk(apiDir);
console.log("✅ All API routes forced to dynamic runtime.");
