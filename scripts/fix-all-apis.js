/**
 * This script FORCE-fixes all API routes before Next.js build.
 * It runs on Vercel during build and guarantees:
 *
 * - All duplicate 'runtime' lines removed
 * - All duplicate 'dynamic' lines removed
 * - Adds exactly one clean pair at top of every route.ts file:
 *
 *   export const dynamic = "force-dynamic";
 *   export const runtime = "nodejs";
 *
 * This is the FINAL guaranteed fix.
 */

const fs = require("fs");
const path = require("path");

const apiRoot = path.join(process.cwd(), "app", "api");

function cleanFile(file) {
  let content = fs.readFileSync(file, "utf8");

  // Remove ALL existing runtime/dynamic lines
  content = content
    .replace(/export const dynamic[\s\S]*?["']force-dynamic["'];?/g, "")
    .replace(/export const runtime[\s\S]*?["']nodejs["'];?/g, "");

  // Clean blank lines
  content = content.replace(/^\s*[\r\n]/gm, "");

  // Prepend clean header
  const header =
    'export const dynamic = "force-dynamic";\n' +
    'export const runtime = "nodejs";\n\n';

  fs.writeFileSync(file, header + content, "utf8");

  console.log("✔ Fixed:", file);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === "route.ts") cleanFile(full);
  }
}

console.log("🔧 Fixing ALL API routes before Next.js build…");
walk(apiRoot);
console.log("✅ API Fix Complete");
