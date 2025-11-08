/**
 * 🧩 BharatComfort11 - Final Await Syntax Fixer (Universal)
 * Fixes Firestore leftovers like:
 *   - const snap = await ref);
 *   - await ref, { ... });
 *   - any stray extra parentheses from regex conversions
 */

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");

(async () => {
  const files = await fg(["app/api/**/*.ts"]);
  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    const original = content;

    // 1️⃣ Fix all 'await ref);' → 'await ref.get();'
    content = content.replace(/await\s+([a-zA-Z_]+Ref)\s*\);/g, "await $1.get();");

    // 2️⃣ Fix all 'await ref, {' → 'await ref.update({'
    content = content.replace(/await\s+([a-zA-Z_]+Ref)\s*,\s*\{/g, "await $1.update({");

    // 3️⃣ Fix weird ",->" or stray commas introduced by Netlify regex parsing
    content = content.replace(/,\s*->/g, "");

    // 4️⃣ Remove dangling extra parentheses
    content = content.replace(/\)\);/g, ");");

    // 5️⃣ Collapse double semicolons
    content = content.replace(/;;+/g, ";");

    if (content !== original) {
      fs.writeFileSync(file, content, "utf8");
      console.log("✅ Fixed:", path.relative(process.cwd(), file));
    }
  }

  console.log("\n🎉 All Firestore 'await' syntax fixed and cleaned successfully!");
})();
