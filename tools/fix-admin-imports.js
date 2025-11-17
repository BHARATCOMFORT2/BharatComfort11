/**
 * Fix ALL incorrect "import { admin }" usage in the project.
 * Converts them to:
 *
 *   import { getFirebaseAdmin } from "@/lib/firebaseadmin";
 *   const { admin, adminDb, adminAuth, adminStorage } = getFirebaseAdmin();
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.join(process.cwd(), "app");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) fixFile(full);
  }
}

function fixFile(file) {
  let content = fs.readFileSync(file, "utf8");

  if (!content.includes(`import { admin } from "@/lib/firebaseadmin"`)) return;

  console.log("Fixing import in:", file);

  // Remove incorrect admin import
  content = content.replace(
    `import { admin } from "@/lib/firebaseadmin";`,
    `import { getFirebaseAdmin } from "@/lib/firebaseadmin";\n` +
      `const { admin, adminDb, adminAuth, adminStorage } = getFirebaseAdmin();`
  );

  fs.writeFileSync(file, content, "utf8");
}

console.log("🔧 Fixing ALL incorrect { admin } imports...");
walk(rootDir);
console.log("✅ Finished — all imports fixed!");
