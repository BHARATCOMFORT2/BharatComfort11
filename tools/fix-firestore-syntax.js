/**
 * 🔧 BharatComfort11 Firestore Syntax Auto-Fix (CommonJS Version)
 * Fixes corrupted Firestore calls that cause “Expected a semicolon” errors.
 *
 * Replaces:
 *   ❌ await ref);
 *   ✅ await ref.get();
 *
 *   ❌ await ref, { ... });
 *   ✅ await ref.update({ ... });
 */

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");

const baseDir = path.join(process.cwd(), "app/api");

// Regex fix patterns
const fixes = [
  {
    find: /await\s+([a-zA-Z0-9_]+)\s*\);/g,
    replace: "await $1.get();",
  },
  {
    find: /await\s+([a-zA-Z0-9_]+)\s*,\s*\{/g,
    replace: "await $1.update({",
  },
];

(async () => {
  console.log("🧩 Scanning Firestore API files...");
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
    total
      ? `🎯 Done! Fixed syntax errors in ${total} file(s).`
      : "✅ No syntax errors found."
  );
})();
