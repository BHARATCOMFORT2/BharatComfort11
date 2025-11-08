/**
 * 🔧 BharatComfort11 - Firestore Syntax Auto-Fix
 * Fixes all semicolon-related syntax errors caused by incorrect Firestore conversions.
 *
 * It automatically replaces:
 *   ❌ await ref);
 *   ✅ await ref.get();
 *
 *   ❌ await ref, { ... });
 *   ✅ await ref.update({ ... });
 */

import fs from "fs";
import path from "path";
import fg from "fast-glob";

const baseDir = path.join(process.cwd(), "app/api");

// Regex patterns to fix syntax errors
const fixes = [
  {
    find: /await\s+([a-zA-Z0-9_]+)\s*\);/g,
    replace: "await $1.get();",
    reason: "Fixes 'await ref);' to 'await ref.get();'",
  },
  {
    find: /await\s+([a-zA-Z0-9_]+)\s*,\s*\{/g,
    replace: "await $1.update({",
    reason: "Fixes 'await ref, {' to 'await ref.update({'",
  },
];

(async () => {
  console.log("🧩 Scanning for Firestore syntax errors...");
  const files = await fg(["app/api/**/*.ts"]);

  let total = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    let changed = false;

    for (const fix of fixes) {
      if (fix.find.test(content)) {
        content = content.replace(fix.find, fix.replace);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, content, "utf8");
      console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
      total++;
    }
  }

  console.log(
    total > 0
      ? `🎉 Done! Fixed syntax errors in ${total} file(s).`
      : "✅ No syntax errors found."
  );
})();
