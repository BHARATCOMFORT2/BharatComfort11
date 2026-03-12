import Razorpay from "razorpay";
import crypto from "crypto";

/* ---------------------------------------------------------
Prevent client execution
--------------------------------------------------------- */
if (typeof window !== "undefined") {
throw new Error("razorpay-server.ts cannot run on client");
}

let razorpayInstance: Razorpay | null = null;

/* ---------------------------------------------------------
Resolve Razorpay secret
--------------------------------------------------------- */
function resolveSecret(): string | null {
const raw = process.env.RAZORPAY_KEY_SECRET?.trim();
const encoded = process.env.RAZORPAY_KEY_SECRET_BASE64?.trim();

if (raw) return raw;

if (encoded) {
try {
return Buffer.from(encoded, "base64").toString("utf8");
} catch (err) {
console.error("❌ Razorpay Base64 decode failed:", err);
}
}

return null;
}

/* ---------------------------------------------------------
Get Razorpay keys
--------------------------------------------------------- */
function getKeys() {
const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = resolveSecret()?.trim();

if (!keyId || !keySecret) {
console.error("❌ Missing Razorpay environment variables");
return null;
}

return { keyId, keySecret };
}

/* ---------------------------------------------------------
Singleton Razorpay instance
--------------------------------------------------------- */
export function getRazorpayServerInstance(): Razorpay {
if (razorpayInstance) return razorpayInstance;

const keys = getKeys();

if (!keys) {
throw new Error("Razorpay keys missing");
}

razorpayInstance = new Razorpay({
key_id: keys.keyId,
key_secret: keys.keySecret,
});

return razorpayInstance;
}

/* ---------------------------------------------------------
Create Razorpay order
--------------------------------------------------------- */
export async function createOrder({
amount,
currency = "INR",
receipt,
notes = {},
}: {
amount: number;
currency?: string;
receipt?: string;
notes?: Record<string, any>;
}) {
if (!amount || amount <= 0) {
throw new Error("Invalid order amount");
}

const instance = getRazorpayServerInstance();

const order = await instance.orders.create({
amount: Math.round(amount * 100), // convert to paise
currency,
receipt: receipt || `order_${Date.now()}`,
notes,
});

return order;
}

/* ---------------------------------------------------------
Verify Razorpay payment signature
--------------------------------------------------------- */
export function verifyPayment({
razorpay_order_id,
razorpay_payment_id,
razorpay_signature,
}: {
razorpay_order_id: string;
razorpay_payment_id: string;
razorpay_signature: string;
}) {
const secret = resolveSecret();

if (!secret) {
console.error("❌ Razorpay secret missing");
return false;
}

const expectedSignature = crypto
.createHmac("sha256", secret)
.update(`${razorpay_order_id}|${razorpay_payment_id}`)
.digest("hex");

return expectedSignature === razorpay_signature;
}
