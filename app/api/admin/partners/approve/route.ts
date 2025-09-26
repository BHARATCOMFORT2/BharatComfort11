// app/api/admin/partners/approve/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { token, partnerId } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing token" }, { status: 401 });
    }

    // use adminAuth to verify token
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded || (decoded as any).role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (!partnerId) {
      return NextResponse.json({ success: false, error: "Missing partnerId" }, { status: 400 });
    }

    // Approve partner in Firestore (adminDb)
    await adminDb.collection("partners").doc(partnerId).set({ approved: true }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Approve partner error:", err);
    return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
  }
}
