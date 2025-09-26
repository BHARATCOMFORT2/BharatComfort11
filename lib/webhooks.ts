// lib/webhooks.ts
import crypto from "crypto";

/**
 * Verify webhook signature.
 *
 * @param body - The raw request body string (must be unparsed text).
 * @param signature - The value from "x-razorpay-signature" header.
 * @param secret - Your Razorpay webhook secret (passed in from server route).
 *
 * @returns true if valid, false otherwise
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    return expected === signature;
  } catch (err) {
    console.error("Error verifying webhook signature:", err);
    return false;
  }
}
