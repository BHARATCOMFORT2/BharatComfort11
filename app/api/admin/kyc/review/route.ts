import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";

/**
 * POST /api/admin/kyc/review
 * Body: { partnerId, action: "approve" | "reject", remark?: string }
 */
export async function POST(req: Request) {
  try {
    const { partnerId, action, remark = "" } = await req.json();

    if (!partnerId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    const partnerRef = db.collection("partners").doc(partnerId);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const status = action === "approve" ? "approved" : "rejected";

    await partnerRef.update({
      "kyc.status": status,
      "kyc.reviewedAt": new Date(),
      "kyc.remark": remark,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `KYC ${status}`,
    });
  } catch (error) {
    console.error("KYC review error:", error);
    return NextResponse.json({ error: "Failed to review KYC" }, { status: 500 });
  }
}
