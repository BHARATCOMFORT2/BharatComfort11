/**
 * Smart API patcher:
 * - Adds dynamic + runtime only if missing
 * - Removes duplicate runtime definitions
 */

const fs = require("fs");
const path = require("path");

const targetDir = path.join(__dirname, "..", "app", "api");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && entry.name === "route.ts") {
      patchFile(full);
    }
  }
}

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  let lines = content.split("\n");

  // Remove duplicate runtime lines
  lines = lines.filter(
    (line, index) =>
      !(
        line.includes('export const runtime') &&
        lines.findIndex((l) => l.includes('export const runtime')) !== index
      )
  );

  content = lines.join("\n");

  const needsDynamic = !content.includes('export const dynamic');
  const needsRuntime = !content.includes('export const runtime');

  if (!needsDynamic && !needsRuntime) {
    console.log("Already patched:", filePath);
    return;
  }

  console.log("Patching:", filePath);

  let insertBlock = "";

  if (needsDynamic) {
    insertBlock += 'export const dynamic = "force-dynamic";\n';
  }
  if (needsRuntime) {
    insertBlock += 'export const runtime = "nodejs";\n';
  }
  insertBlock += "\n";

  const final = insertBlock + content;

  fs.writeFileSync(filePath, final, "utf8");
}

console.log("🔧 Patching all API routes…");
walk(targetDir);
console.log("✅ Done. All API routes updated cleanly!");
