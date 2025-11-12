/**
 * 🚀 BharatComfort11 — Ultimate Dynamic Fix for Vercel Builds
 * Forces all API routes to run dynamically with Node.js runtime.
 * Adds: runtime="nodejs", dynamic="force-dynamic", revalidate=0
 */

import fs from "fs";
import path from "path";

const apiDir = path.join(process.cwd(), "app", "api");
let patched = 0;
let skipped = 0;
let already = 0;

function injectHeader(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // Skip already dynamic or edge runtime
  if (content.includes('export const dynamic = "force-dynamic"')) {
    already++;
    return;
  }
  if (content.includes('export const runtime = "edge"')) {
    skipped++;
    return;
  }

  const header = `export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

`;

  fs.writeFileSync(filePath, header + content, "utf8");
  patched++;
  console.log("🩵 Fixed:", filePath);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) walk(fullPath);
    else if (
      (item.endsWith(".ts") || item.endsWith(".js")) &&
      fullPath.includes(path.join("app", "api"))
    ) {
      injectHeader(fullPath);
    }
  }
}

console.log("🧩 Scanning app/api for static routes...");
walk(apiDir);

console.log("\n🎯 Summary:");
console.log(`🧩 Patched: ${patched}`);
console.log(`⚡ Already OK: ${already}`);
console.log(`⏭️ Skipped (edge runtime): ${skipped}`);
console.log("✅ All API routes forced to dynamic runtime with revalidate=0.");
