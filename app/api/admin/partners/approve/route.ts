// app/api/admin/partners/approve/route.ts
import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseadmin"; // must export initialized admin SDK
import * as adminAuth from "firebase-admin/auth";

export async function POST(req: Request) {
  try {
    const bearer = req.headers.get("authorization") || "";
    const token = bearer.startsWith("Bearer ") ? bearer.split(" ")[1] : null;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    // Verify ID token and check custom claims/role
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

    // Update partner doc
    await partnerRef.update({
      isActive: true,
      approvedBy: decoded.uid,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Optionally: also set corresponding user doc active and give partner custom claim
    // If partners also have a user record in 'users' collection:
    const userRef = admin.firestore().collection("users").doc(partnerId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      await userRef.ref.update({ isActive: true, role: "partner", emailVerified: true });
    }

    // Add an in-app notification for the partner
    await admin.firestore().collection("notifications").add({
      userId: partnerId,
      title: "✅ Partner Account Approved",
      message: "Your partner account has been approved. You can now add listings and go live.",
      type: "partner_approval",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // (Optional) trigger email via existing sendEmailOnNotification cloud function (it listens to notifications)
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Approve error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
