/**
 * Fix Firestore import and usage in API/server files
 * Converts `firebase/firestore` client SDK to `firebase-admin/firestore`
 * ✅ Safe for Netlify / Next.js API routes
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app/api", "lib"]; // scan these folders

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      results.push(filePath);
    }
  });
  return results;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // Skip if file already uses admin SDK
  if (content.includes("firebase-admin/firestore")) return false;

  let modified = false;

  // Replace wrong Firestore import
  if (content.includes('from "firebase/firestore"')) {
    content = content.replace(/from\s+["']firebase\/firestore["']/g, 'from "firebase-admin/firestore"');
    modified = true;
  }

  // Replace doc(db, ...) → db.collection(...).doc(...)
  const docRegex = /doc\(\s*db\s*,\s*["'`](.*?)["'`]\s*,\s*(.*?)\s*\)/g;
  if (docRegex.test(content)) {
    content = content.replace(docRegex, 'db.collection("$1").doc($2)');
    modified = true;
  }

  // Replace getDoc(docRef) → docRef.get()
  content = content.replace(/await\s+getDoc\((.*?)\)/g, 'await $1.get()');

  // Replace updateDoc(ref, data) → ref.update(data)
  content = content.replace(/await\s+updateDoc\((.*?),\s*(.*?)\)/g, 'await $1.update($2)');

  // Replace addDoc(collectionRef, data) → collectionRef.add(data)
  content = content.replace(/await\s+addDoc\((.*?),\s*(.*?)\)/g, 'await $1.add($2)');

  if (modified) {
    // Add import for FieldValue if missing
    if (!content.includes("FieldValue")) {
      content =
        `import { FieldValue } from "firebase-admin/firestore";\n` + content;
    }

    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Fixed Firestore imports in ${filePath}`);
    return true;
  }

  return false;
}

// Run fixer
let fixedCount = 0;
for (const dir of TARGET_DIRS) {
  const fullDir = path.join(ROOT, dir);
  if (fs.existsSync(fullDir)) {
    const files = walk(fullDir);
    files.forEach((file) => {
      if (fixFile(file)) fixedCount++;
    });
  }
}

console.log(`\n🔥 Firestore Fix Complete! Updated ${fixedCount} files.`);
