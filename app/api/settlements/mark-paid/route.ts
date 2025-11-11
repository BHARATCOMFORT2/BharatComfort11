// app/api/settlements/mark-paid/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import admin from "firebase-admin";
import { sendEmail } from "@/lib/email";
import { generateSettlementInvoice } from "@/lib/invoices/generateSettlementInvoice";

/**
 * POST /api/settlements/mark-paid
 * Body: { settlementId: string, utrNumber?: string }
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
        { error: "Only admin can mark settlements as paid" },
        { status: 403 }
      );
    }

    const { settlementId, utrNumber } = await req.json();
    if (!settlementId)
      return NextResponse.json(
        { error: "settlementId is required" },
        { status: 400 }
      );

    const ref = db.collection("settlements").doc(settlementId);
    const snap = await ref.get();
    if (!snap.exists)
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      );

    const data = snap.data()!;
    if (data.status !== "approved") {
      return NextResponse.json(
        { error: "Settlement must be approved before marking as paid" },
        { status: 400 }
      );
    }

    // ✅ Update Firestore record
    const now = new Date();
    let newInvoiceUrl = data.invoiceUrl || "";

    try {
      const invoiceUrl = await generateSettlementInvoice(settlementId, {
        partnerName: data.partnerName || "",
        partnerEmail: data.partnerEmail || "",
        amount: Number(data.amountRequested || 0),
        status: "paid",
        utrNumber: utrNumber || "-",
      });
      if (invoiceUrl) newInvoiceUrl = invoiceUrl;
    } catch (e) {
      console.warn("⚠️ Invoice generation failed:", e);
    }

    await ref.update({
      status: "paid",
      utrNumber: utrNumber || "-",
      paidAt: now,
      updatedAt: now,
      invoiceUrl: newInvoiceUrl,
      remark: "Marked paid by admin",
    });

    // ✅ Add system log entry
    await db.collection("system_logs").add({
      type: "settlement_mark_paid",
      settlementId,
      utrNumber: utrNumber || "-",
      adminId: decoded.uid,
      amount: Number(data.amountRequested || 0),
      createdAt: now,
    });

    // ✅ Email confirmation (safe send)
    if (data.partnerEmail) {
      try {
        await sendEmail(
          data.partnerEmail,
          "✅ Settlement Payout Completed",
          `
            <h3>Settlement Paid</h3>
            <p>Hello ${data.partnerName || "Partner"},</p>
            <p>Your settlement for <b>₹${Number(
              data.amountRequested || 0
            ).toLocaleString("en-IN")}</b> has been marked as <b>paid</b>.</p>
            ${
              utrNumber
                ? `<p><b>UTR Number:</b> ${utrNumber}</p>`
                : ""
            }
            ${
              newInvoiceUrl
                ? `<p><b>Invoice:</b> <a href="${newInvoiceUrl}" target="_blank">View PDF</a></p>`
                : ""
            }
            <p>💰 The funds should reflect in your bank account shortly.</p>
            <p>Thank you for partnering with <b>BharatComfort11</b>.</p>
          `
        );
      } catch (mailErr) {
        console.warn("⚠️ Failed to send payout email:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Settlement marked as paid successfully.",
      utrNumber: utrNumber || "-",
      invoiceUrl: newInvoiceUrl,
    });
  } catch (err) {
    console.error("❌ Mark Paid Error:", err);
    return NextResponse.json(
      { error: "Failed to mark settlement as paid" },
      { status: 500 }
    );
  }
}
