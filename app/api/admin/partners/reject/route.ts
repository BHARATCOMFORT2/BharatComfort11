// app/api/admin/partners/reject/route.ts
import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const bearer = req.headers.get("authorization") || "";
    const token = bearer.startsWith("Bearer ") ? bearer.split(" ")[1] : null;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = await admin.auth().verifyIdToken(token);
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { partnerId, reason } = await req.json();
    if (!partnerId) return NextResponse.json({ success: false, error: "partnerId required" }, { status: 400 });

    const partnerRef = admin.firestore().collection("partners").doc(partnerId);
    const partnerSnap = await partnerRef.get();
    if (!partnerSnap.exists) return NextResponse.json({ success: false, error: "Partner not found" }, { status: 404 });

    await partnerRef.update({
      isActive: false,
      rejectedBy: decoded.uid,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectedReason: reason || null,
    });

    // Notify partner
    await admin.firestore().collection("notifications").add({
      userId: partnerId,
      title: "⛔ Partner Account Rejected",
      message: `Your partner account has been rejected. ${reason ? `Reason: ${reason}` : ""}`,
      type: "partner_rejected",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Reject error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
