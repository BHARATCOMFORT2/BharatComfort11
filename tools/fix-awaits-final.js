/**
 * 🧩 BharatComfort11 - Final Firestore Await Syntax Fixer
 * Fixes: "await ref);" → "await ref.get();" and "await ref, {" → "await ref.update({"
 */

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");

(async () => {
  const files = await fg(["app/api/**/*.ts"]);
  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    const original = content;

    // Fix get() issues
    content = content.replace(/await\s+([a-zA-Z_]+Ref)\s*\);/g, "await $1.get();");

    // Fix update() issues
    content = content.replace(/await\s+([a-zA-Z_]+Ref)\s*,\s*\{/g, "await $1.update({");

    // Remove double semicolons or weird syntax leftovers
    content = content.replace(/\)\);\s*;/g, "));");

    if (content !== original) {
      fs.writeFileSync(file, content, "utf8");
      console.log("✅ Fixed syntax in:", path.relative(process.cwd(), file));
    }
  }
  console.log("\n🎉 All Firestore await syntax issues fixed safely!");
})();
