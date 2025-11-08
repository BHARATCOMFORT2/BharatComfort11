/**
 * 🔧 BHARATCOMFORT11 Firestore Auto-Fixer (CommonJS version)
 * Compatible with Node 18 (Netlify / Vercel / CI)
 */

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");

const apiDir = path.join(process.cwd(), "app/api");

const replacements = [
  { find: /import\s*\{[^\}]*\}\s*from\s*["']firebase\/firestore["'];?/g, replace: "" },
  { find: /collection\s*\(\s*db\s*,/g, replace: "db.collection(" },
  { find: /doc\s*\(\s*db\s*,\s*["']([^"']+)["']\s*,\s*([^)]+)\)/g, replace: 'db.collection("$1").doc($2)' },
  { find: /getDocs\s*\(\s*/g, replace: "" },
  { find: /\.getDocs\(\)/g, replace: ".get()" },
  { find: /getDoc\s*\(\s*/g, replace: "" },
  { find: /\.getDoc\(\)/g, replace: ".get()" },
  { find: /updateDoc\s*\(/g, replace: "" },
  { find: /\.updateDoc\(\)/g, replace: ".update()" },
  { find: /serverTimestamp\s*\(\s*\)/g, replace: "FieldValue.serverTimestamp()" },
];

function fixFile(file) {
  let content = fs.readFileSync(file, "utf8");
  let changed = false;

  for (const { find, replace } of replacements) {
    if (find.test(content)) {
      content = content.replace(find, replace);
      changed = true;
    }
  }

  // Add import for FieldValue if missing
  if (
    changed &&
    !content.includes('firebase-admin/firestore') &&
    content.includes('FieldValue.serverTimestamp()')
  ) {
    content = `const { FieldValue } = require("firebase-admin/firestore");\n${content}`;
  }

  if (changed) {
    fs.writeFileSync(file, content, "utf8");
    console.log("✅ Fixed:", path.relative(process.cwd(), file));
  }
}

(async () => {
  const files = await fg(["app/api/**/*.ts"]);
  for (const file of files) fixFile(file);
  console.log("\n🎉 Firebase client SDK syntax replaced with Admin SDK successfully!");
})();
