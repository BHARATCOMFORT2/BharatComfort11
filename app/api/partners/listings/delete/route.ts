export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    /* ─────────────────────────────
       ✅ 1️⃣ AUTH VERIFY
    ───────────────────────────── */
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "").trim();

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    /* ─────────────────────────────
       ✅ 2️⃣ KYC ENFORCEMENT
    ───────────────────────────── */
    const partnerSnap = await adminDb.collection("partners").doc(uid).get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { ok: false, error: "Partner profile not found" },
        { status: 403 }
      );
    }

    const partner = partnerSnap.data();

    const kycStatus =
      partner?.kycStatus ||
      partner?.kyc?.status ||
      partner?.kyc?.kycStatus ||
      "NOT_STARTED";

    if (kycStatus !== "APPROVED") {
      return NextResponse.json(
        {
          ok: false,
          error: "KYC not approved. You cannot delete listings yet.",
          kycStatus,
        },
        { status: 403 }
      );
    }

    /* ─────────────────────────────
       ✅ 3️⃣ REQUEST BODY
    ───────────────────────────── */
    const body = await req.json().catch(() => null);

    if (!body || !body.id) {
      return NextResponse.json(
        { ok: false, error: "Listing id is required" },
        { status: 400 }
      );
    }

    const listingId = body.id;

    /* ─────────────────────────────
       ✅ 4️⃣ OWNERSHIP CHECK
    ───────────────────────────── */
    const ref = adminDb.collection("listings").doc(listingId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { ok: false, error: "Listing not found" },
        { status: 404 }
      );
    }

    const docData = snap.data() || {};

    if (docData.partnerId !== uid) {
      return NextResponse.json(
        { ok: false, error: "Not authorized to delete this listing" },
        { status: 403 }
      );
    }

    /* ─────────────────────────────
       ✅ 5️⃣ SOFT DELETE (FIRESTORE SAFE)
    ───────────────────────────── */
    await ref.update({
      status: "deleted",
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,          // ✅ STANDARDIZED
      id: listingId,
    });
  } catch (err: any) {
    console.error("❌ delete listing error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
