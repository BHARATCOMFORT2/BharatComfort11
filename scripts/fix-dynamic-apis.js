/**
 * fix-dynamic-apis.js
 * Automatically adds:
 *   export const runtime = "nodejs";
 *   export const dynamic = "force-dynamic";
 * to all app/api route files missing them.
 */

import fs from "fs";
import path from "path";

const apiDir = path.join(process.cwd(), "app", "api");

function addDynamicRuntime(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  // Skip if already has either line
  if (content.includes('export const dynamic') || content.includes('export const runtime')) {
    console.log("✅ Already dynamic:", filePath);
    return;
  }

  const injectCode = `export const runtime = "nodejs";
export const dynamic = "force-dynamic";

`;

  const updated = injectCode + content;
  fs.writeFileSync(filePath, updated, "utf8");
  console.log("🩵 Fixed:", filePath);
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (/\.(ts|js)$/.test(file)) {
      addDynamicRuntime(fullPath);
    }
  }
}

console.log("🚀 Scanning app/api for dynamic routes...");
walk(apiDir);
console.log("✅ Done! All eligible API routes are now forced dynamic.");
