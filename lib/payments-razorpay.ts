/* ---------------------------------------------------------
   lib/payments-razorpay.ts
   Universal Razorpay loader (Server + Client safe)
--------------------------------------------------------- */

const isServer = typeof window === "undefined";

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */

type RazorpayServerExports = {
  createOrder?: Function;
  verifySignature?: Function;
};

type RazorpayClientExports = {
  openRazorpayCheckout?: Function;
  loadRazorpayScript?: Function;
};

/* ---------------------------------------------------------
   Server Module
--------------------------------------------------------- */

let serverModule: RazorpayServerExports = {};

if (isServer) {
  try {
    serverModule = require("./payments/razorpay-server");
  } catch (err) {
    console.warn("⚠ Razorpay server module not loaded:", err);
  }
}

/* ---------------------------------------------------------
   Client Module
--------------------------------------------------------- */

let clientModule: RazorpayClientExports = {};

try {
  clientModule = require("./payments/razorpay-client");
} catch (err) {
  console.warn("⚠ Razorpay client module not loaded:", err);
}

/* ---------------------------------------------------------
   Server Exports
--------------------------------------------------------- */

export const createOrder = serverModule.createOrder;

export const verifySignature = serverModule.verifySignature;

/* ---------------------------------------------------------
   Client Exports
--------------------------------------------------------- */

export const openRazorpayCheckout = clientModule.openRazorpayCheckout;

export const loadRazorpayScript = clientModule.loadRazorpayScript;

/* ---------------------------------------------------------
   Default Export (optional)
--------------------------------------------------------- */

export default {
  createOrder,
  verifySignature,
  openRazorpayCheckout,
  loadRazorpayScript,
};
