// app/api/partners/profile/update/route.ts

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

/**
 * ✅ POST /api/partners/profile/update
 *
 * Body supports:
 * {
 *   businessName?: string;
 *   phone?: string;
 *   address?: object;
 *   bank?: object;
 * }
 *
 * Auth: Session cookie (__session | session | firebase_session)
 */

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    // -----------------------------------
    // 1️⃣ Verify Session Cookie (ALL VARIANTS)
    // -----------------------------------
    const cookieHeader = req.headers.get("cookie") || "";

    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find(
          (c) =>
            c.startsWith("__session=") ||
            c.startsWith("session=") ||
            c.startsWith("firebase_session=")
        )
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json(
        { ok: false, success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json(
        { ok: false, success: false, error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // -----------------------------------
    // 2️⃣ Parse Body (safe)
    // -----------------------------------
    const body = await req.json().catch(() => ({}));

    const { businessName, phone, address, bank } = body || {};

    if (!businessName && !phone && !address && !bank) {
      return NextResponse.json(
        { ok: false, success: false, error: "Nothing to update" },
        { status: 400 }
      );
    }

    // -----------------------------------
    // 3️⃣ Prepare Safe Update Payload
    // -----------------------------------
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (typeof businessName === "string" && businessName.trim()) {
      updateData.businessName = businessName.trim();
    }

    if (typeof phone === "string" && phone.trim()) {
      updateData.phone = phone.trim();
    }

    if (typeof address === "object" && address) {
      updateData.address = address;
    }

    if (typeof bank === "object" && bank) {
      updateData.bank = bank;
    }

    // -----------------------------------
    // 4️⃣ Update Partner Document
    // -----------------------------------
    const partnerRef = adminDb.collection("partners").doc(uid);
    await partnerRef.set(updateData, { merge: true });

    return NextResponse.json({
      ok: true,
      success: true,
      message: "✅ Partner profile updated successfully",
    });
  } catch (err: any) {
    console.error("❌ Partner Profile Update Error:", err);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: err?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
