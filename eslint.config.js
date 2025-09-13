// eslint.config.js

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import tailwindPlugin from "eslint-plugin-tailwindcss";

/** @type {import("eslint").Linter.Config[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      tailwindcss: tailwindPlugin,
    },
    rules: {
      // Next.js rules
      "@next/next/no-img-element": "off", // allow <img>, since we sometimes use external
      "@next/next/no-html-link-for-pages": "off",

      // Tailwind rules
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/no-custom-classname": "off",

      // TypeScript rules
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // General JS rules
      "no-console": "warn",
      "prefer-const": "warn"
    },
    settings: {
      tailwindcss: {
        callees: ["classnames", "clsx", "ctl"],
        config: "tailwind.config.js",
      },
    },
  },
];
