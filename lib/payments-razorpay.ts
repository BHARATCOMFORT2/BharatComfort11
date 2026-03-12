/* ---------------------------------------------------------
BHARATCOMFORT11
Universal Razorpay Loader (Server + Client Safe)
--------------------------------------------------------- */

const isServer = typeof window === "undefined";

/* ---------------------------------------------------------
Types
--------------------------------------------------------- */

type RazorpayServerExports = {
createOrder?: (
amount: number,
bookingId: string
) => Promise<{ orderId: string }>;
verifySignature?: (
orderId: string,
paymentId: string,
signature: string
) => boolean;
};

type RazorpayClientExports = {
openRazorpayCheckout?: (options: {
orderId: string;
amount: number;
name: string;
email?: string;
phone?: string;
onSuccess?: (resp: any) => void;
onFailure?: (err: any) => void;
}) => void;

loadRazorpayScript?: () => Promise<boolean>;
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

if (!isServer) {
try {
clientModule = require("./payments/razorpay-client");
} catch (err) {
console.warn("⚠ Razorpay client module not loaded:", err);
}
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
Default Export
--------------------------------------------------------- */

export default {
createOrder,
verifySignature,
openRazorpayCheckout,
loadRazorpayScript,
};
