// lib/payments-razorpay.ts
// Universal entry point that works for both app/ and pages/

const isServer = typeof window === "undefined";

let serverExports: any = {};
let clientExports: any = {};

// Load server-only code only in server environment
if (isServer) {
  serverExports = require("./payments/razorpay-server");
}

// Always load client-side checkout (safe on both)
clientExports = require("./payments/razorpay-client");

module.exports = {
  ...serverExports,
  ...clientExports,
};
