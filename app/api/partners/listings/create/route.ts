// app/api/partners/listings/create/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

/* ✅ SAFE AUTH HEADER READER */
function getAuthHeader(req: Request) {
  return req.headers.get("authorization") || "";
}

export async function POST(req: Request) {
  try {
    /* ─────────────────────────────
       ✅ 1️⃣ AUTH VERIFY
    ───────────────────────────── */
    const authHeader = getAuthHeader(req);

    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "").trim();

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    /* ─────────────────────────────
       ✅ 2️⃣ KYC ENFORCEMENT (CRITICAL)
    ───────────────────────────── */
    const partnerSnap = await adminDb.collection("partners").doc(uid).get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Partner profile not found" },
        { status: 403 }
      );
    }

    const partner = partnerSnap.data();

    if (partner?.kycStatus !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          error: "KYC not approved. You cannot create listings yet.",
          kycStatus: partner?.kycStatus || "NOT_STARTED",
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
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { title, description, price, location, metadata } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { success: false, error: "title is required" },
        { status: 400 }
      );
    }

    /* ─────────────────────────────
       ✅ 4️⃣ CREATE LISTING
    ───────────────────────────── */
    const docRef = adminDb.collection("listings").doc();

    const payload = {
      id: docRef.id,
      partnerId: uid,          // ✅ STANDARDIZED FIELD
      title,
      description: description || "",
      price: typeof price === "number" ? price : Number(price) || 0,
      location: location || null,
      metadata: metadata || {},
      status: "active",
      createdAt: FieldValue.serverTimestamp(), // ✅ SAFE
      updatedAt: FieldValue.serverTimestamp(), // ✅ SAFE
    };

    await docRef.set(payload);

    return NextResponse.json({
      success: true,
      listingId: docRef.id,
      listing: payload,
    });
  } catch (err: any) {
    console.error("❌ CREATE LISTING ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
