// app/api/admin/partners/approve/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";
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
    const { partnerId } = body;
    if (!partnerId) return NextResponse.json({ success: false, error: "partnerId required" }, { status: 400 });

    const partnerRef = admin.firestore().collection("partners").doc(partnerId);
    const partnerSnap = await partnerRef.get();
    if (!partnerSnap.exists) return NextResponse.json({ success: false, error: "Partner not found" }, { status: 404 });

    const partnerData = partnerSnap.data() || {};

    // Approve partner in Firestore
    await partnerRef.update({
      isActive: true,
      approvedBy: decoded.uid,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Also update user record if exists
    const userRef = admin.firestore().collection("users").doc(partnerId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      await userRef.ref.update({ isActive: true, role: "partner" });
    }

    // Add notification
    await admin.firestore().collection("notifications").add({
      userId: partnerId,
      title: "✅ Partner Account Approved",
      message: "Your partner account has been approved. You can now add listings and go live.",
      type: "partner_approval",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // --- Send Welcome Email ---
    if (partnerData.email) {
      const msg = {
        to: partnerData.email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: "Welcome to BharatComfort – Partner Account Approved",
        html: `
          <h2>Hi ${partnerData.name || "Partner"},</h2>
          <p>🎉 Congratulations! Your <b>BharatComfort Partner Account</b> has been approved.</p>
          <p>You can now log in and start creating listings, managing bookings, and growing your business with us.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/partners/dashboard" 
                style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">
            Go to Dashboard
          </a></p>
          <p>Need help? Our support team is just one click away.</p>
          <br/>
          <p>Best Regards,<br/>Team BharatComfort</p>
        `,
      };

      await sgMail.send(msg);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Approve error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
