// prettier.config.cjs
module.exports = {
  singleQuote: true,                  // use single quotes
  semi: true,                         // add semicolons
  trailingComma: 'all',               // add trailing commas where valid
  tabWidth: 2,                        // 2 spaces per tab
  printWidth: 100,                    // wrap lines at 100 chars
  plugins: [require('prettier-plugin-tailwindcss')], // Tailwind plugin
};
