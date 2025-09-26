import { NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseadmin";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: Request) {
  try {
    const bearer = req.headers.get("authorization") || "";
    const token = bearer.startsWith("Bearer ") ? bearer.split(" ")[1] : null;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = await admin.auth().verifyIdToken(token);
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { partnerId, reason } = body;
    if (!partnerId || !reason) {
      return NextResponse.json({ success: false, error: "partnerId and reason required" }, { status: 400 });
    }

    const partnerRef = adminDb.collection("partners").doc(partnerId);
    const partnerSnap = await partnerRef.get();
    if (!partnerSnap.exists) {
      return NextResponse.json({ success: false, error: "Partner not found" }, { status: 404 });
    }

    const partnerData = partnerSnap.data() || {};

    await partnerRef.update({
      isActive: false,
      rejectedBy: decoded.uid,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectionReason: reason,
    });

    await adminDb.collection("notifications").add({
      userId: partnerId,
      title: "❌ Partner Account Rejected",
      message: `Your partner account request has been rejected. Reason: ${reason}`,
      type: "partner_rejection",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (partnerData.email) {
      await sgMail.send({
        to: partnerData.email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: "BharatComfort – Partner Account Rejected",
        html: `
          <h2>Hi ${partnerData.name || "Partner"},</h2>
          <p>Your <b>BharatComfort Partner Account</b> request has been rejected.</p>
          <p><b>Reason:</b> ${reason}</p>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Reject error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
