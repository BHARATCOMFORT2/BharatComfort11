export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";
import { generateRefundInvoice } from "@/lib/invoices/generateRefundInvoice";
import { uploadInvoiceToFirebase } from "@/lib/storage/uploadInvoice";
import { sendInvoiceEmail } from "@/lib/emails/sendInvoiceEmail";
import { pushInvoiceNotification } from "@/lib/notifications/pushInvoiceNotification";

/**
 * POST /api/refunds/update
 * Admin endpoint
 * Body: { refundId: string, newStatus: "approved" | "processed" }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role || "user";

    if (role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admins only" },
        { status: 403 }
      );
    }

    const { refundId, newStatus } = await req.json();
    if (!refundId || !["approved", "processed"].includes(newStatus)) {
      return NextResponse.json(
        { error: "Invalid refundId or status" },
        { status: 400 }
      );
    }

    const refundRef = db.collection("refunds").doc(refundId);
    const refundSnap = await refundRef.get();

    if (!refundSnap.exists) {
      return NextResponse.json(
        { error: "Refund record not found" },
        { status: 404 }
      );
    }

    const refund = refundSnap.data();
    if (!refund) {
      return NextResponse.json(
        { error: "Refund data is missing" },
        { status: 500 }
      );
    }

    // ✅ Update refund status
    await refundRef.update({
      refundStatus: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
      ...(newStatus === "processed" && {
        processedAt: FieldValue.serverTimestamp(),
      }),
    });

    // ✅ Generate refund invoice if not exists
    let invoiceUrl = refund.invoiceUrl;
    let invoiceId = refund.invoiceId;

    if (!invoiceUrl) {
      invoiceId = `INV-RF-${Date.now()}`;
      const pdfBuffer = await generateRefundInvoice({
        refundId,
        bookingId: refund.bookingId,
        userId: refund.userId,
        invoiceId,
        userName: refund.userName || "User",
        userEmail: refund.userEmail || "",
        amount: refund.amount,
        mode: refund.paymentMode || "razorpay",
        reason: refund.notes || "Admin processed refund",
        createdAt: new Date(),
      });

      // Upload PDF
      invoiceUrl = await uploadInvoiceToFirebase(
        pdfBuffer,
        invoiceId,
        "refund"
      );

      // Save invoice details
      await refundRef.update({
        invoiceId,
        invoiceUrl,
        invoiceGeneratedAt: FieldValue.serverTimestamp(),
      });
    }

    // ✅ Send email to user
    if (refund.userEmail) {
      await sendInvoiceEmail({
        to: refund.userEmail,
        subject:
          newStatus === "approved"
            ? `Refund Approved - ${invoiceId}`
            : `Refund Processed - ${invoiceId}`,
        invoiceId,
        pdfUrl: invoiceUrl,
        type: "refund",
        details: {
          name: refund.userName || "User",
          bookingId: refund.bookingId,
          amount: refund.amount,
          date: new Date().toLocaleDateString("en-IN"), // ✅ fixed
        },
      });
    }

    // ✅ Push admin notification
    await pushInvoiceNotification({
      type: "refund",
      invoiceId,
      invoiceUrl,
      userId: refund.userId,
      amount: refund.amount,
      relatedId: refund.bookingId,
    });

    console.log(`✅ Refund ${refundId} marked as ${newStatus}`);

    return NextResponse.json({
      success: true,
      message: `Refund ${newStatus} successfully.`,
      refundId,
      invoiceUrl,
    });
  } catch (error) {
    console.error("❌ Refund update error:", error);
    return NextResponse.json(
      { error: "Failed to update refund" },
      { status: 500 }
    );
  }
}
