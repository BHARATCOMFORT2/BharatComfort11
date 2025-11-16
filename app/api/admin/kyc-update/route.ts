export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseadmin";

/**
 * POST /api/admin/kyc-update
 * Body: { partnerId: string, status: "approved" | "rejected" }
 */
export async function POST(req: Request) {
  try {
    const { partnerId, status } = await req.json();

    if (!partnerId || !["approved", "rejected"].includes(status))
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    await db.collection("partners").doc(partnerId).set(
      {
        kyc: { status, reviewedAt: new Date() },
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, message: `KYC ${status}` });
  } catch (err) {
    console.error("KYC update error:", err);
    return NextResponse.json({ error: "Failed to update KYC" }, { status: 500 });
  }
}
