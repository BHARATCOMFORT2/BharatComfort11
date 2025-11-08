/**
 * 🔧 Auto-fix Firestore async syntax errors across your repo
 * ---------------------------------------------------------
 * Replaces broken lines like:
 *    const snap = await ref);
 *    await ref, { status: ... });
 *
 * With correct syntax:
 *    const snap = await getDoc(ref);
 *    await updateDoc(ref, { status: ... });
 */

import fs from "fs";
import path from "path";

const rootDir = "./app"; // scan all app/api routes

function fixContent(content) {
  return (
    content
      // Fix missing .get()
      .replace(/await\s+([a-zA-Z0-9_]+)\s*\);/g, "await getDoc($1);")
      // Fix missing .update()
      .replace(/await\s+([a-zA-Z0-9_]+)\s*,\s*\{/g, "await updateDoc($1, {")
      // Fix missing .get() for queries
      .replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*await\s+q\);/g, "const $1 = await getDocs(q);")
      // Fix common naming like `const snapshot = await q);`
      .replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*await\s+([a-zA-Z0-9_]+)\);/g, "const $1 = await getDocs($2);")
  );
}

function walk(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      const fixed = fixContent(content);
      if (content !== fixed) {
        fs.writeFileSync(fullPath, fixed, "utf8");
        console.log("✅ Fixed:", fullPath);
      }
    }
  });
}

walk(rootDir);
console.log("🎉 All Firestore await syntax issues fixed successfully!");
