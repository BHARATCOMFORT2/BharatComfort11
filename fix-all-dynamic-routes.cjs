/**
 * ⚙️ BHARATCOMFORT11 — Full Dynamic Route Auto-Fix Script
 * -------------------------------------------------------
 * ✅ Scans all /app/api and /pages/api route files (.ts + .js)
 * ✅ Adds "force-dynamic" + "nodejs" runtime exports automatically
 * ✅ Avoids duplicates if already present
 * ✅ Commits changes automatically to Git
 *
 * Usage: node fix-all-dynamic-routes.cjs
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Directories to scan
const TARGET_DIRS = ["./app/api", "./pages/api"];

// Detects use of request headers, URL, or cookies
const dynamicPattern = /(request\.headers|request\.url|cookies\(|headers\()/;

// Add exports to the top of each file if missing
function patchFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");

    // Skip if file doesn't use dynamic elements
    if (!dynamicPattern.test(content)) return;

    // Skip if already marked dynamic
    if (content.includes('export const dynamic') || content.includes('force-dynamic')) return;

    const updated = `export const dynamic = "force-dynamic";\nexport const runtime = "nodejs";\n\n${content}`;
    fs.writeFileSync(filePath, updated, "utf8");
    console.log(`✅ Patched: ${filePath}`);
  } catch (err) {
    console.error(`⚠️ Failed to patch ${filePath}: ${err.message}`);
  }
}

// Recursively scan a directory
function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) walkDir(fullPath);
    else if (/route\.(js|ts)$/.test(file)) patchFile(fullPath);
  }
}

// Run patch across both folders
console.log("🚀 Scanning for dynamic routes...");
for (const dir of TARGET_DIRS) walkDir(dir);

// Commit automatically
try {
  execSync('git add app/api pages/api && git commit -m "fix: mark all API routes as force-dynamic + nodejs runtime"', {
    stdio: "inherit",
  });
  console.log("✅ Git commit created successfully.");
} catch (err) {
  console.log("⚠️ Git commit skipped (no repo or no changes).");
}

console.log("✨ Done! All dynamic route warnings should now be silenced.");
