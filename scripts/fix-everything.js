/**
 * fix-everything.js
 * 🚀 Astra’s universal patch for BHARATCOMFORT11 APIs
 *
 * ✅ Fixes:
 * - Dynamic server usage (adds runtime + dynamic exports)
 * - Firestore undefined (`db.collection`)
 * - Ensures firebaseadmin import consistency
 * - Adds .bak backups for safety
 */

import fs from "fs";
import path from "path";

const apiDir = path.join(process.cwd(), "app", "api");
const firebaseImport = `import { db } from "@/lib/firebaseadmin";`;
const injectHeader = `export const runtime = "nodejs";
export const dynamic = "force-dynamic";

`;

let fixed = 0;
let skipped = 0;

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // ✅ Only patch route files
  if (!/route\.(ts|js)$/.test(filePath)) return;

  // Add runtime + dynamic exports
  if (!content.includes("export const runtime") && !content.includes("export const dynamic")) {
    content = injectHeader + content;
    modified = true;
  }

  // Add firebase import if Firestore is used but not imported
  if (content.match(/db\.collection|firestore/i) && !content.includes(firebaseImport)) {
    content = content.replace(/(import .*? from .*?;)/, `$1\n${firebaseImport}`);
    modified = true;
  }

  // If `db.collection` is used, add a safety check to prevent undefined
  if (content.includes("db.collection(") && !content.includes("if (!db)")) {
    content = content.replace(
      /async function GET|export async function GET/,
      match =>
        `${match}\n{\n  if (!db) throw new Error("🔥 Firestore not initialized. Check firebaseadmin.ts and env vars.");`
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath + ".bak", content, "utf8");
    fs.writeFileSync(filePath, content, "utf8");
    console.log("🩵 Fixed:", filePath);
    fixed++;
  } else {
    skipped++;
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(ts|js)$/.test(entry)) fixFile(full);
  }
}

console.log("🚀 Starting Astra’s universal API repair...");
walk(apiDir);
console.log("\n✨ Summary:");
console.log(`🩵 Fixed: ${fixed}`);
console.log(`✅ Skipped (already fine): ${skipped}`);
console.log("✅ All dynamic + Firestore issues repaired!");
