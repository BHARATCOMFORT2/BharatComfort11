/**
 * 🩹 BharatComfort11 Await Syntax Auto-Fixer
 * ---------------------------------------------------------
 * Fixes broken Firestore conversion issues introduced by regex:
 *   - `await somethingRef);` → `const somethingSnap = await somethingRef.get();`
 *   - `await somethingRef, {` → `await somethingRef.update({`
 */

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");

async function fixAwaitSyntax() {
  const apiDir = path.join(process.cwd(), "app/api");
  const files = await fg([`${apiDir}/**/*.ts`]);

  const patternGet = /await\s+([a-zA-Z_]+Ref\));/g;
  const patternUpdate = /await\s+([a-zA-Z_]+Ref),/g;

  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    let changed = false;

    // 🧩 Fix `.get()` mistakes
    if (patternGet.test(content)) {
      content = content.replace(patternGet, "const $1Snap = await $1.get();");
      changed = true;
    }

    // 🧩 Fix `.update()` mistakes
    if (patternUpdate.test(content)) {
      content = content.replace(patternUpdate, "await $1.update(");
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, content, "utf8");
      console.log(`✅ Fixed await syntax in: ${path.relative(process.cwd(), file)}`);
    }
  }

  console.log("\n🎉 All broken await() patterns fixed successfully!\n");
}

fixAwaitSyntax().catch((err) => {
  console.error("❌ Fix failed:", err);
  process.exit(1);
});
