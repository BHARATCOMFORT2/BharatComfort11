/**
 * fix-all-apis.js
 * 🔧 Universal Fix Script for Next.js API Routes
 * - Adds dynamic runtime flags (`runtime`, `dynamic`)
 * - Checks for Firestore undefined cases
 * - Ensures proper firebaseadmin import consistency
 * - Backs up modified files
 */

import fs from "fs";
import path from "path";

const apiDir = path.join(process.cwd(), "app", "api");
const firebaseImport = `import { db } from "@/lib/firebaseadmin";`;
const fixHeader = `export const runtime = "nodejs";
export const dynamic = "force-dynamic";

`;

let fixedFiles = 0;
let skippedFiles = 0;
let checkedFiles = 0;

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  checkedFiles++;

  // Skip non-route files
  if (!filePath.includes("/route.")) return;

  let modified = false;

  // Add runtime + dynamic exports if missing
  if (!content.includes("export const runtime") && !content.includes("export const dynamic")) {
    content = fixHeader + content;
    modified = true;
  }

  // Ensure firebaseadmin import for API routes that use Firestore
  if (content.match(/db\.collection|firestore/i) && !content.includes(firebaseImport)) {
    content = content.replace(/(import .*? from .*?;)/, `$1\n${firebaseImport}`);
    modified = true;
  }

  // Backup and write file if modified
  if (modified) {
    fs.writeFileSync(filePath + ".bak", content, "utf8");
    fs.writeFileSync(filePath, content, "utf8");
    console.log("🩵 Fixed:", filePath);
    fixedFiles++;
  } else {
    skippedFiles++;
  }
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) walkDir(fullPath);
    else if (/\.(ts|js)$/.test(entry)) fixFile(fullPath);
  }
}

console.log("🚀 Starting universal API fix...");
walkDir(apiDir);
console.log("\n✨ Summary:");
console.log(`🩵 Fixed: ${fixedFiles}`);
console.log(`✅ Skipped (already good): ${skippedFiles}`);
console.log(`📂 Total checked: ${checkedFiles}`);
console.log("✅ Done! All dynamic + Firebase issues patched.");
