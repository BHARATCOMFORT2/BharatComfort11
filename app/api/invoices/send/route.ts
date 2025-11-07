export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import "server-only";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebaseadmin";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/invoices/send
 * Body: { type: "booking" | "refund", id: string, to?: string }
 *
 * - Finds the latest invoice for the given booking/refund and emails a link.
 * - Uses Admin SDK only (no client Firestore helpers).
 */
export async function POST(req: Request) {
  try {
    // ---- Auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role || "user";
    if (!["admin", "partner"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ---- Payload ----
    const { type, id, to } = await req.json();
    if (!id || (type !== "booking" && type !== "refund")) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // ---- Load source doc (booking or refund) ----
    const collectionName = type === "refund" ? "refunds" : "bookings";
    const srcSnap = await adminDb.collection(collectionName).doc(id).get();
    if (!srcSnap.exists) {
      return NextResponse.json({ error: `${collectionName.slice(0, -1)} not found` }, { status: 404 });
    }
    const src = srcSnap.data() || {};

    // ---- Find latest invoice in top-level invoices collection ----
    const key = type === "refund" ? "refundId" : "bookingId";
    const invQ = adminDb
      .collection("invoices")
      .where(key, "==", id)
      .orderBy("createdAt", "desc")
      .limit(1);

    const invSnap = await invQ.get();
    if (invSnap.empty) {
      return NextResponse.json({ error: "No invoice found for this record" }, { status: 404 });
    }

    const invoice = { id: invSnap.docs[0].id, ...(invSnap.docs[0].data() as any) };
    const invoiceUrl: string = invoice.invoiceUrl || "";

    if (!invoiceUrl) {
      return NextResponse.json({ error: "Invoice URL missing on invoice document" }, { status: 422 });
    }

    // ---- Determine recipient ----
    // precedence: explicit `to` > source.userEmail > user doc email
    let recipient = (typeof to === "string" && to) || src.userEmail || "";

    if (!recipient && src.userId) {
      const userSnap = await adminDb.collection("users").doc(String(src.userId)).get();
      if (userSnap.exists) {
        const u = userSnap.data() || {};
        recipient = u.email || recipient;
      }
    }

    if (!recipient) {
      return NextResponse.json({ error: "Recipient email not found" }, { status: 422 });
    }

    // ---- Send email ----
    const subject =
      type === "refund"
        ? `BHARATCOMFORT11 — Refund Invoice for ${id}`
        : `BHARATCOMFORT11 — Booking Invoice for ${id}`;

    const html = `
      <p>Hello,</p>
      <p>Your ${type === "refund" ? "refund" : "booking"} invoice is ready.</p>
      <p>
        <a href="${invoiceUrl}" target="_blank" rel="noopener noreferrer">
          Download Invoice
        </a>
      </p>
      <p>Thank you for using BHARATCOMFORT11.</p>
    `;

    await sendEmail(recipient, subject, html);

    return NextResponse.json({
      success: true,
      message: `Invoice sent to ${recipient}`,
      invoiceId: invoice.id,
      invoiceUrl,
    });
  } catch (err) {
    console.error("POST /api/invoices/send error:", err);
    return NextResponse.json({ error: "Failed to send invoice" }, { status: 500 });
  }
}
