/**
 * 🧩 BharatComfort11 - Firestore Await Auto-Fix Script
 * Fixes all "await ref);" → "await ref.get();" and "await ref, {" → "await ref.update({"
 */

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");

(async () => {
  const files = await fg(["app/api/**/*.ts"]);
  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    const original = content;

    content = content
      .replace(/await\s+([a-zA-Z_]+Ref)\);/g, "await $1.get();")
      .replace(/await\s+([a-zA-Z_]+Ref)\s*,/g, "await $1.update(");

    if (content !== original) {
      fs.writeFileSync(file, content, "utf8");
      console.log("✅ Fixed awaits in:", path.relative(process.cwd(), file));
    }
  }
  console.log("\n🎉 All Firestore await syntax fixed successfully!");
})();
