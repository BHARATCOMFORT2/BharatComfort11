import fs from "fs";
import path from "path";
import fg from "fast-glob";

const fixPatterns = [
  { find: /await\s+([a-zA-Z0-9_]+)\);/g, replace: "await $1.get();" },
  { find: /await\s+([a-zA-Z0-9_]+),\s*\{/g, replace: "await $1.update({" }
];

const files = fg.sync(["app/api/**/*.ts"]);

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let fixed = false;

  for (const { find, replace } of fixPatterns) {
    if (find.test(content)) {
      content = content.replace(find, replace);
      fixed = true;
    }
  }

  if (fixed) {
    fs.writeFileSync(file, content, "utf8");
    console.log("✅ Fixed:", path.relative(process.cwd(), file));
  }
}

console.log("\n🎯 All broken 'await ref);' and 'await ref, {' patterns have been repaired.");
