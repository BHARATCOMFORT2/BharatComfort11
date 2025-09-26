import { NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseadmin";

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

    if (!partnerId) {
      return NextResponse.json({ success: false, error: "partnerId required" }, { status: 400 });
    }

    await adminDb.collection("partners").doc(partnerId).update({
      isActive: true,
      approvedBy: decoded.uid,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Approve error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
