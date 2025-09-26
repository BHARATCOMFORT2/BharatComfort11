import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  const { adminDb } = getFirebaseAdmin();

  try {
    const data = await req.json();

    if (!data.partnerId) {
      return NextResponse.json({ success: false, error: "partnerId is required" }, { status: 400 });
    }

    await adminDb.collection("partners").doc(data.partnerId).update({
      approved: false,
      rejectedAt: new Date(),
      rejectionReason: data.reason || "Not specified",
    });

    return NextResponse.json({ success: true, message: "Partner rejected successfully" });
  } catch (err: any) {
    console.error("Error rejecting partner:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
