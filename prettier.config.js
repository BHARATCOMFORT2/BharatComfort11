// prettier.config.js

/** @type {import("prettier").Config} */
module.exports = {
  semi: true,
  singleQuote: false,
  printWidth: 100,
  tabWidth: 2,
  trailingComma: "es5",
  bracketSpacing: true,
  arrowParens: "always",
  plugins: [require("prettier-plugin-tailwindcss")],
  tailwindFunctions: ["clsx", "classnames"],
};
