/**
 * scripts/patch_server_imports.js
 *
 * Scans server-side API files and replaces imports from 'firebase/firestore'
 * (and related firebase client imports) with the compat shim path '@/lib/firebase-compat'
 *
 * Run:
 *   node scripts/patch_server_imports.js
 *
 * Make a git commit before running to be able to revert quickly.
 */

const fs = require("fs");
const path = require("path");
const glob = require("fast-glob");

const repoRoot = process.cwd();
const shimPath = "@/lib/firebase-compat"; // adjust if your path mapping differs

// Patterns to patch: server API directories
const patterns = [
  "app/api/**/*.ts",
  "app/api/**/*.tsx",
  "pages/api/**/*.ts",
  "pages/api/**/*.tsx",
  // also patch any server-only admin scripts you want scanned
];

(async () => {
  const files = await glob(patterns, { dot: true, onlyFiles: true });
  console.log(`Patching ${files.length} server files...`);

  let patched = 0;

  for (const fp of files) {
    const abs = path.join(repoRoot, fp);
    let text = fs.readFileSync(abs, "utf8");

    const origText = text;

    // Replace specific imports from firebase/firestore
    // Example: import { doc, getDoc } from "firebase/firestore";
    text = text.replace(
      /import\s*\{([^}]+)\}\s*from\s*['"]firebase\/firestore['"];?/g,
      (m, p1) => {
        // produce named imports but from shim
        return `import { ${p1.trim()} } from "${shimPath}";`;
      }
    );

    // Replace imports that pull serverTimestamp only
    text = text.replace(
      /import\s*\{([^}]*serverTimestamp[^}]*)\}\s*from\s*['"]firebase\/firestore['"];?/g,
      (m, p1) => `import { ${p1.trim()} } from "${shimPath}";`
    );

    // Replace imports from firebase/auth or firebase/storage if used server-side erroneously
    // (we won't fully emulate these here; we point them to firebase-admin or leave untouched)
    text = text.replace(
      /from\s+['"]firebase\/auth['"]/g,
      `from "${shimPath}"; // patched: firebase/auth -> firebase-compat (verify behavior)`
    );
    text = text.replace(
      /from\s+['"]firebase\/storage['"]/g,
      `from "${shimPath}"; // patched: firebase/storage -> firebase-compat (verify behavior)`
    );

    // Also fix occurrences of serverTimestamp() direct imports usage
    // e.g., serverTimestamp()
    // no change required if import fixed above.

    if (text !== origText) {
      fs.writeFileSync(abs, text, "utf8");
      patched++;
      console.log(`Patched: ${fp}`);
    }
  }

  console.log(`Done. Files patched: ${patched}. Please run typecheck/build to verify.`);
})();
