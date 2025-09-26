#!/usr/bin/env ts-node
import { execSync } from "child_process";
import * as fs from "fs";

// 1️⃣ Check required env vars
console.log("Checking environment variables...\n");

const requiredEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
];

let missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error("❌ Missing environment variables:", missingVars.join(", "));
} else {
  console.log("✅ All required environment variables are set.");
}

// 2️⃣ Check TypeScript errors
console.log("\nChecking TypeScript errors...");
try {
  execSync("npx tsc --noEmit", { stdio: "inherit" });
  console.log("✅ No TypeScript errors detected.");
} catch {
  console.error("❌ TypeScript errors detected above.");
}

// 3️⃣ Check Next.js build
console.log("\nChecking Next.js build...");
try {
  execSync("npx next build", { stdio: "inherit" });
  console.log("✅ Next.js build successful.");
} catch {
  console.error("❌ Next.js build errors detected above.");
}

// 4️⃣ Run ESLint
console.log("\nRunning ESLint...");
try {
  execSync("npx eslint . --ext .ts,.tsx", { stdio: "inherit" });
  console.log("✅ ESLint found no issues.");
} catch {
  console.error("❌ ESLint issues detected above.");
}

console.log("\nDiagnostics complete.");
