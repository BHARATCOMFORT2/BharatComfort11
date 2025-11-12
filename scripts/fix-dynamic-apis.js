/**
 * fix-dynamic-apis.js
 * Adds:
 *   export const runtime = "nodejs";
 *   export const dynamic = "force-dynamic";
 * To all missing API route files under app/api.
 * Creates .bak backups for each modified file.
 */

import fs from "fs";
import path from "path";

const apiDir = path.join(process.cwd(), "app", "api");

let fixedCount = 0;
let skippedCount = 0;

function processFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  // Skip if already has dynamic/runtime export
  if (content.includes("export const dynamic") || content.includes("export const runtime")) {
    skippedCount++;
    console.log("✅ Already dynamic:", filePath);
    return;
  }

  // Backup before modifying
  fs.writeFileSync(filePath + ".bak", content, "utf8");

  const injectCode = `export const runtime = "nodejs";
export const dynamic = "force-dynamic";

`;

  const updatedContent = injectCode + content;
  fs.writeFileSync(filePath, updatedContent, "utf8");
  fixedCount++;
  console.log("🩵 Fixed:", filePath);
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (/\.(ts|js)$/.test(entry)) {
      processFile(fullPath);
    }
  }
}

console.log("🚀 Scanning app/api for routes needing dynamic runtime...");
walkDir(apiDir);

console.log("\n✨ Summary:");
console.log(`🩵 Fixed files: ${fixedCount}`);
console.log(`✅ Already dynamic: ${skippedCount}`);
console.log("✅ Done! You can safely deploy again.");
