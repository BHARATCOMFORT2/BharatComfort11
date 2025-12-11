export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// ✅ Auth header helper
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    // ✅ TOKEN VERIFY
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Missing Authorization" },
        { status: 401 }
      );
    }

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m) {
      return NextResponse.json(
        { success: false, message: "Bad Authorization header" },
        { status: 401 }
      );
    }

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(m[1], true);
    const staffId = decoded.uid;

    // ✅ READ BODY
    const body = await req.json();
    const { holderName, bankName, ifsc, accountLast4 } = body || {};

    if (!holderName || !bankName || !ifsc || !accountLast4) {
      return NextResponse.json(
        {
          success: false,
          message:
            "holderName, bankName, ifsc and accountLast4 are required",
        },
        { status: 400 }
      );
    }

    if (String(accountLast4).length !== 4) {
      return NextResponse.json(
        { success: false, message: "Invalid account last 4 digits" },
        { status: 400 }
      );
    }

    // ✅ VERIFY STAFF
    const staffRef = adminDb.collection("staff").doc(staffId);
    const staffSnap = await staffRef.get();

    if (!staffSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Staff not found" },
        { status: 404 }
      );
    }

    const staffData = staffSnap.data();

    if (
      staffData?.role !== "telecaller" ||
      staffData?.status !== "approved" ||
      staffData?.isActive !== true
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized staff access" },
        { status: 403 }
      );
    }

    // ✅ SAVE BANK DETAILS (SAFE MODE)
    await staffRef.update({
      bank: {
        holderName: String(holderName).trim(),
        bankName: String(bankName).trim(),
        ifsc: String(ifsc).trim().toUpperCase(),
        last4: String(accountLast4),
        verified: false, // ✅ Admin will verify later
      },
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "✅ Bank details saved successfully",
    });
  } catch (err: any) {
    console.error("❌ update-bank error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update bank details",
      },
      { status: 500 }
    );
  }
}
