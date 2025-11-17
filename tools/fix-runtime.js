// tools/fix-runtime.js
// Astra Runtime Conflict Auto-Fix Script

import fs from "fs";
import path from "path";

const projectRoot = process.cwd();
const target = projectRoot;

let fixedFiles = [];

function scan(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scan(fullPath);
    } else if (entry.isFile() && fullPath.match(/\.(ts|tsx|js|jsx)$/)) {
      let content = fs.readFileSync(fullPath, "utf8");

      // Remove ALL runtime flags
      const cleaned = content
        .replace(/export const runtime\s*=\s*["']nodejs["'];?/g, "")
        .replace(/export const runtime\s*=\s*["']edge["'];?/g, "")
        .replace(/export const runtime\s*=\s*["'].*?["'];?/g, "");

      if (cleaned !== content) {
        fixedFiles.push(fullPath);
        fs.writeFileSync(fullPath, cleaned.trim() + "\n", "utf8");
      }
    }
  }
}

console.log("🔎 Fixing runtime conflicts...");
scan(target);

console.log("✅ Runtime fix complete.");
console.log(`📝 Files modified: ${fixedFiles.length}`);
fixedFiles.forEach(f => console.log("   - " + f));
