/**
 * Automatic API fix for Next.js to prevent static rendering.
 * 
 * This script scans all route.ts files under /app/api
 * and injects:
 * 
 *   export const dynamic = "force-dynamic";
 *   export const runtime = "nodejs";
 * 
 * at the top of each API file.
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
      fixFile(full);
    }
  }
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // Already patched?
  if (content.includes(`export const dynamic = "force-dynamic"`)) {
    console.log("Already patched:", filePath);
    return;
  }

  const patch = `export const dynamic = "force-dynamic";\nexport const runtime = "nodejs";\n\n`;

  fs.writeFileSync(filePath, patch + content, "utf8");
  console.log("Patched:", filePath);
}

// Run patcher
console.log("Patching all API routes…");
walk(targetDir);
console.log("Done.");
