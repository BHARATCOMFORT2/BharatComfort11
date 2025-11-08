import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";
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
      return NextResponse.json(
        { error: "Partner profile not found" },
        { status: 404 }
      );

    const partnerData = partnerSnap.data() || {};
    if (!partnerData.kyc || partnerData.kyc?.status !== "approved")
      return NextResponse.json(
        { error: "KYC not verified. Complete verification first." },
        { status: 403 }
      );

    if (role !== "partner")
      return NextResponse.json(
        { error: "Only partners can create settlement requests" },
        { status: 403 }
      );

    const { bookingIds = [], totalAmount } = await req.json();
    if (!bookingIds.length || !totalAmount)
      return NextResponse.json(
        { error: "bookingIds and totalAmount are required" },
        { status: 400 }
      );

    // ✅ Check for duplicates
    const existingSnap = await db
      .collection("settlements")
      .where("partnerId", "==", uid)
      .where("status", "in", ["pending", "approved"])
      .get();

    const duplicate = existingSnap.docs.find((doc) =>
      bookingIds.some((id: string) =>
        (doc.data().bookingIds || []).includes(id)
      )
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

    // ✅ Create settlement
    const settlementRef = await db.collection("settlements").add({
      partnerId: uid,
      partnerName: decoded.name || "",
      partnerEmail: decoded.email || "",
      bookingIds,
      amount: Number(totalAmount),
      status: "pending",
      remark: "Awaiting admin review",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      hasDispute: false,
      invoiceUrl: "",
    });

    // ✅ Mark bookings
    await Promise.all(
      bookingIds.map(async (bId: string) => {
        await db.collection("bookings").doc(bId).update({
          settlementStatus: "requested",
        });
      })
    );

    // ✅ Auto invoice
    let autoInvoiceUrl = "";
    const allPaid = partnerBookings.every(
      (b) => b.status === "completed" || b.paymentStatus === "paid"
    );

    if (allPaid) {
      autoInvoiceUrl = await generateSettlementInvoice(settlementRef.id, {
        partnerName: decoded.name || "",
        partnerEmail: decoded.email || "",
        amount: Number(totalAmount),
        status: "pending",
        utrNumber: "-",
      });

      if (autoInvoiceUrl) {
        await settlementRef.update({ invoiceUrl: autoInvoiceUrl });
      }
    }

    // ✅ Emails
    await sendEmail(
      "admin@bharatcomfort11.com",
      `🧾 New Settlement Request from ${decoded.email}`,
      `
      <h3>New Settlement Request</h3>
      <p><b>Partner:</b> ${decoded.name || "Unknown"} (${decoded.email})</p>
      <p><b>Amount:</b> ₹${Number(totalAmount).toLocaleString("en-IN")}</p>
      <p><b>Bookings:</b> ${bookingIds.join(", ")}</p>
      <p>Status: Pending Admin Review</p>
      ${
        autoInvoiceUrl
          ? `<p><b>Invoice:</b> <a href="${autoInvoiceUrl}" target="_blank">View PDF</a></p>`
          : ""
      }
      `
    );

    await sendEmail(
      decoded.email,
      "✅ Settlement Request Received",
      `
      <h3>Thank you, ${decoded.name || "Partner"}!</h3>
      <p>Your settlement request for ₹${Number(totalAmount).toLocaleString(
        "en-IN"
      )} covering ${bookingIds.length} bookings was submitted successfully.</p>
      ${autoInvoiceUrl ? `<a href="${autoInvoiceUrl}">View Invoice</a>` : ""}
      `
    );

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
