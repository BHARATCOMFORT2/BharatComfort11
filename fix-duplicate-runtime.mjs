import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "app", "api");

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8").split("\n");

  let seen = false;
  const fixed = content.filter((line) => {
    if (line.includes('export const runtime = "nodejs";')) {
      if (seen) {
        return false; // REMOVE duplicate
      }
      seen = true;
      return true; // KEEP first one
    }
    return true;
  });

  if (fixed.join("\n") !== content.join("\n")) {
    fs.writeFileSync(filePath, fixed.join("\n"), "utf8");
    console.log("✅ Fixed:", filePath);
  }
}

function walk(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (item === "route.ts") {
      fixFile(fullPath);
    }
  }
}

console.log("🔧 Cleaning duplicate runtime from all route.ts...");
walk(ROOT);
console.log("✅ DONE. Now commit and push.");
