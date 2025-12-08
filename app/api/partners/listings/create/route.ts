export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
          error: "KYC not approved. You cannot create listings yet.",
          kycStatus,
        },
        { status: 403 }
      );
    }

    /* ─────────────────────────────
       ✅ 3️⃣ REQUEST BODY
    ───────────────────────────── */
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { title, description, price, location, metadata } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { ok: false, error: "title is required" },
        { status: 400 }
      );
    }

    /* ─────────────────────────────
       ✅ 4️⃣ CREATE LISTING
    ───────────────────────────── */
    const docRef = adminDb.collection("listings").doc();

    const payload = {
      id: docRef.id,
      partnerId: uid,             // ✅ standard
      title: title.trim(),
      description: description || "",
      price: typeof price === "number" ? price : Number(price) || 0,
      location: location || "",  // ✅ NEVER null
      metadata: metadata || {},
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(payload);

    return NextResponse.json({
      ok: true,                   // ✅ STANDARDIZED
      listingId: docRef.id,
      listing: payload,
    });
  } catch (err: any) {
    console.error("❌ CREATE LISTING ERROR:", err);

    return NextResponse.json(
      {
        ok: false,                // ✅ STANDARDIZED
        error: err?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
