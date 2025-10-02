/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint"], // ✅ removed react + react-hooks (already in next/core-web-vitals)
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    // Relax rules so you can build faster
    "@typescript-eslint/no-explicit-any": "off", // allow "any"
    "no-console": "off", // allow console.log, console.error, etc.
    "react-hooks/exhaustive-deps": "warn", // show warning instead of error
  },
};
