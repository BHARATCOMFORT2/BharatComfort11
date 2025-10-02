@echo off
REM ==============================================
REM BHARATCOMFORT11: Fix ESLint + Prettier + TS-ESLint
REM ==============================================

cd /d %~dp0

echo ==============================================
echo ✅ Step 1: Set project to ESM
echo ==============================================
REM Add "type": "module" to package.json if not present
powershell -Command "(Get-Content package.json) -replace '({)', '{`n  `"type`": `"module`",' | Set-Content package.json"

echo ==============================================
echo ✅ Step 2: Install compatible TypeScript ESLint packages
echo ==============================================
npm install --save-dev @typescript-eslint/parser@7.2.0 @typescript-eslint/eslint-plugin@7.2.0 --legacy-peer-deps

echo ==============================================
echo ✅ Step 3: Backup old Prettier config and create prettier.config.cjs
echo ==============================================
if exist prettier.config.js ren prettier.config.js prettier.config.js.bak

(
echo module.exports = {
echo   singleQuote: true,
echo   semi: true,
echo   trailingComma: "all",
echo   tabWidth: 2,
echo   printWidth: 100,
echo   plugins: [require("prettier-plugin-tailwindcss")],
echo };
) > prettier.config.cjs

echo ==============================================
echo ✅ Step 4: Run ESLint auto-fix
echo ==============================================
npx eslint --fix .

echo ==============================================
echo ✅ Step 5: Run Prettier auto-format
echo ==============================================
npx prettier --write .

echo ==============================================
echo 🎉 All ESLint + Prettier issues should now be fixed!
pause
