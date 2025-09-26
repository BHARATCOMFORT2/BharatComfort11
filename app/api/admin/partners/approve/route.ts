// app/api/admin/partners/approve/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  const { adminDb } = getFirebaseAdmin();

  try {
    const data = await req.json();

    if (!data.partnerId) {
      return NextResponse.json({ success: false, error: "partnerId is required" }, { status: 400 });
    }

    // Update the partner document to mark as approved
    await adminDb.collection("partners").doc(data.partnerId).update({
      approved: true,
      approvedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: "Partner approved successfully" });
  } catch (err: any) {
    console.error("Error approving partner:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
