/**
 * FINAL FIX:
 * Removes ALL duplicate "runtime" and "dynamic" exports from ALL API route files.
 * Ensures only ONE of each export exists.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "app", "api");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && entry.name === "route.ts") {
      fixRoute(full);
    }
  }
}

function fixRoute(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  console.log("🔧 Cleaning:", filePath);

  // Remove ALL occurrences
  let cleaned = content
    .replace(/export const runtime = "nodejs";?/g, "")
    .replace(/export const dynamic = "force-dynamic";?/g, "");

  // Trim empty lines from start
  cleaned = cleaned.replace(/^\s*[\r\n]/gm, "");

  // Prepend exactly ONE clean copy
  const header =
    'export const dynamic = "force-dynamic";\n' +
    'export const runtime = "nodejs";\n\n';

  cleaned = header + cleaned;

  fs.writeFileSync(filePath, cleaned, "utf8");
}

console.log("🧹 Removing ALL duplicate runtime/dynamic…");
walk(root);
console.log("✅ Cleanup completed — ALL API routes fixed!");
