// app/api/admin/partners/reject/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminDb, firebaseAdmin } from "@/lib/firebaseadmin";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: Request) {
  try {
    const bearer = req.headers.get("authorization") || "";
    const token = bearer.startsWith("Bearer ") ? bearer.split(" ")[1] : null;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
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

    // Update partner doc
    await partnerRef.update({
      isActive: false,
      rejectedBy: decoded.uid,
      rejectedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      rejectionReason: reason,
    });

    // Also update user doc if exists
    const userRef = adminDb.collection("users").doc(partnerId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      await userRef.update({ isActive: false });
    }

    // Add rejection notification
    await adminDb.collection("notifications").add({
      userId: partnerId,
      title: "❌ Partner Account Rejected",
      message: `Your partner account request has been rejected. Reason: ${reason}`,
      type: "partner_rejection",
      read: false,
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    });

    // --- Send Rejection Email ---
    if (partnerData.email) {
      const msg = {
        to: partnerData.email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: "BharatComfort – Partner Account Rejected",
        html: `
          <h2>Hi ${partnerData.name || "Partner"},</h2>
          <p>Unfortunately, your <b>BharatComfort Partner Account</b> request has been rejected.</p>
          <p><b>Reason:</b> ${reason}</p>
          <p>If you believe this was a mistake, you can reapply after making necessary corrections.</p>
          <br/>
          <p>Best Regards,<br/>Team BharatComfort</p>
        `,
      };

      await sgMail.send(msg);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Reject error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
