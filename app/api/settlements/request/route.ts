export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import admin from "firebase-admin";
import { sendEmail } from "@/lib/email";
import { generateSettlementInvoice } from "@/lib/invoices/generateSettlementInvoice";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;
    const role = (decoded as any).role || "partner";

    // ✅ Partner verification
    const partnerRef = db.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();
    if (!partnerSnap.exists)
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });

    const partnerData = partnerSnap.data() || {};
    if (!partnerData.kyc || partnerData.kyc.status !== "approved")
      return NextResponse.json({ error: "KYC not verified. Complete verification first." }, { status: 403 });

    if (role !== "partner")
      return NextResponse.json({ error: "Only partners can create settlement requests" }, { status: 403 });

    const { bookingIds = [], totalAmount } = await req.json();
    if (!bookingIds.length || !totalAmount)
      return NextResponse.json({ error: "bookingIds and totalAmount are required" }, { status: 400 });

    // ✅ Check for duplicates
    const existingSnap = await db
      .collection("settlements")
      .where("partnerId", "==", uid)
      .where("status", "in", ["requested", "approved"])
      .get();

    const duplicate = existingSnap.docs.find((doc) =>
      bookingIds.some((id: string) => (doc.data().bookingIds || []).includes(id))
    );

    if (duplicate)
      return NextResponse.json(
        { error: "Settlement already exists for one or more bookings" },
        { status: 409 }
      );

    // ✅ Get partner’s bookings
    const bookingsSnap = await db
      .collection("bookings")
      .where("partnerId", "==", uid)
      .get();

    const partnerBookings = bookingsSnap.docs
      .filter((d) => bookingIds.includes(d.id))
      .map((d) => ({ id: d.id, ...(d.data() as any) }));

    if (partnerBookings.length !== bookingIds.length)
      return NextResponse.json(
        { error: "Some bookings do not belong to this partner" },
        { status: 403 }
      );

    // ✅ Create settlement record
    const settlementRef = db.collection("settlements").doc();
    await settlementRef.set({
      id: settlementRef.id,
      partnerId: uid,
      partnerName: partnerData.businessName || partnerData.name || "",
      partnerEmail: partnerData.email || "",
      bookingIds,
      amountRequested: Number(totalAmount),
      status: "requested",
      remark: "Awaiting admin review",
      createdAt: new Date(),
      updatedAt: new Date(),
      hasDispute: false,
      invoiceUrl: "",
    });

    // ✅ Lock bookings to this settlement
    await Promise.all(
      bookingIds.map((bId: string) =>
        db.collection("bookings").doc(bId).update({
          settlementLock: settlementRef.id,
          updatedAt: new Date(),
        })
      )
    );

    // ✅ Auto-generate invoice if all paid
    let autoInvoiceUrl = "";
    const allPaid = partnerBookings.every(
      (b) => b.status === "completed" || b.paymentStatus === "paid"
    );

    if (allPaid) {
      autoInvoiceUrl = await generateSettlementInvoice(settlementRef.id, {
        partnerName: partnerData.businessName || "",
        partnerEmail: partnerData.email || "",
        amount: Number(totalAmount),
        status: "requested",
        utrNumber: "-",
      });

      if (autoInvoiceUrl)
        await settlementRef.update({ invoiceUrl: autoInvoiceUrl });
    }

    // ✅ Notify admin & partner (best-effort)
    try {
      await sendEmail(
        "finance@bharatcomfort11.com",
        `🧾 New Settlement Request: ${partnerData.businessName || partnerData.email}`,
        `<p>Partner <b>${partnerData.businessName || partnerData.email}</b> requested ₹${totalAmount.toLocaleString(
          "en-IN"
        )} for ${bookingIds.length} bookings.</p>
         <p>Settlement ID: <b>${settlementRef.id}</b></p>
         ${autoInvoiceUrl ? `<p><a href="${autoInvoiceUrl}">Invoice PDF</a></p>` : ""}`
      );

      await sendEmail(
        partnerData.email,
        "✅ Settlement Request Received",
        `<p>Your settlement request for ₹${totalAmount.toLocaleString(
          "en-IN"
        )} covering ${bookingIds.length} bookings has been submitted successfully.</p>
         ${autoInvoiceUrl ? `<p><a href="${autoInvoiceUrl}">View Invoice</a></p>` : ""}`
      );
    } catch (e) {
      console.warn("Email send failed:", e);
    }

    return NextResponse.json({
      success: true,
      settlementId: settlementRef.id,
      invoiceUrl: autoInvoiceUrl || null,
    });
  } catch (error) {
    console.error("❌ Settlement request error:", error);
    return NextResponse.json(
      { error: "Failed to create settlement request" },
      { status: 500 }
    );
  }
}
