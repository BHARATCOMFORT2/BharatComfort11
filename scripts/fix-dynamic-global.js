/**
 * scripts/fix-dynamic-global.js
 * Ensures every app/api/**/route.ts or route.js has Node dynamic headers.
 */

import fs from "fs";
import path from "path";

const apiDir = path.join(process.cwd(), "app", "api");
let patched = 0;
let skipped = 0;
let already = 0;

function injectHeader(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // Skip if already contains the dynamic header
  if (content.includes('export const dynamic = "force-dynamic"')) {
    already++;
    return;
  }
  // Skip if edge runtime explicitly used
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
  console.log("🩵 Patched:", filePath.replace(process.cwd() + path.sep, ""));
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) walk(fullPath);
    else if ((item.endsWith(".ts") || item.endsWith(".js")) && fullPath.includes(path.join("app", "api"))) {
      injectHeader(fullPath);
    }
  }
}

console.log("🔍 Scanning for /app/api route files...");
walk(apiDir);
console.log(`\n🎯 Summary: patched=${patched}, already=${already}, skipped(edge)=${skipped}`);
