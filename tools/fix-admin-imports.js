/**
 * Fixes all incorrect imports of { admin } from firebaseadmin.
 * Replaces them with:
 *
 *   import { getFirebaseAdmin } from "@/lib/firebaseadmin";
 *   const { admin, adminDb, adminAuth, adminStorage } = getFirebaseAdmin();
 */

const fs = require("fs");
const path = require("path");

const targetDir = path.join(process.cwd(), "app");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) walk(full);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) fixFile(full);
  }
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // If incorrect import is found
  if (content.includes(`import { admin } from "@/lib/firebaseadmin"`)) {
    console.log("Fixing admin import in:", filePath);

    content = content.replace(
      `import { admin } from "@/lib/firebaseadmin";`,
      `import { getFirebaseAdmin } from "@/lib/firebaseadmin";\n` +
      `const { admin, adminDb, adminAuth, adminStorage } = getFirebaseAdmin();`
    );

    fs.writeFileSync(filePath, content, "utf8");
  }
}

console.log("🔧 Fixing all incorrect { admin } imports...");
walk(targetDir);
console.log("✅ Import fix completed!");
