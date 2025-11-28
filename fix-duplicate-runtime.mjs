import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "app", "api");

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8").split("\n");
  let seen = false;

  const fixed = content.filter((line) => {
    if (line.includes('export const runtime = "nodejs";')) {
      if (seen) return false; // remove duplicate
      seen = true;
      return true; // keep first
    }
    return true;
  });

  if (fixed.join("\n") !== content.join("\n")) {
    fs.writeFileSync(filePath, fixed.join("\n"), "utf8");
    console.log("✅ Fixed:", filePath);
  }
}

function walk(dir) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) walk(full);
    else if (item === "route.ts") fixFile(full);
  }
}

console.log("🔧 Cleaning duplicate runtime from all route.ts...");
walk(ROOT);
console.log("✅ DONE");
