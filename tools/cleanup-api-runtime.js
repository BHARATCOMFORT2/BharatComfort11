/**
 * Cleanup Script:
 * - Removes duplicated "export const runtime"
 * - Removes duplicated "export const dynamic"
 * - Ensures only ONE runtime and ONE dynamic exist
 * - Fixes files patched earlier
 */

const fs = require("fs");
const path = require("path");

const targetDir = path.join(__dirname, "..", "app", "api");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && entry.name === "route.ts") {
      cleanFile(full);
    }
  }
}

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let lines = content.split("\n");

  console.log("Cleaning:", filePath);

  // Remove duplicate "runtime" lines
  let runtimeFound = false;
  lines = lines.filter((line) => {
    if (line.includes('export const runtime')) {
      if (runtimeFound) return false; // duplicate → remove
      runtimeFound = true;
    }
    return true;
  });

  // Remove duplicate "dynamic" lines
  let dynamicFound = false;
  lines = lines.filter((line) => {
    if (line.includes('export const dynamic')) {
      if (dynamicFound) return false; // duplicate → remove
      dynamicFound = true;
    }
    return true;
  });

  const cleaned = lines.join("\n");

  fs.writeFileSync(filePath, cleaned, "utf8");
}

console.log("🧹 Cleaning duplicate runtime/dynamic from all API files…");
walk(targetDir);
console.log("✅ Cleanup completed successfully!");
