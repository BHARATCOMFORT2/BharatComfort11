export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    /* ✅ 1️⃣ AUTH */
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "").trim();
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const uid = decoded.uid;

    /* ✅ 2️⃣ KYC CHECK */
    const partnerSnap = await adminDb.collection("partners").doc(uid).get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Partner profile not found" },
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
          success: false,
          error: "KYC not approved. You cannot create listings yet.",
          kycStatus,
        },
        { status: 403 }
      );
    }

    /* ✅ 3️⃣ BODY */
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      price,
      location,
      images,
      allowPayAtHotel,
      metadata,
    } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { success: false, error: "title is required" },
        { status: 400 }
      );
    }

    /* ✅ 4️⃣ SANITIZE IMAGES */
    const safeImages = Array.isArray(images)
      ? images.filter((u: any) => typeof u === "string" && u.startsWith("http"))
      : [];

    /* ✅ 5️⃣ CREATE LISTING */
    const docRef = adminDb.collection("listings").doc();

    const payload = {
      id: docRef.id,
      partnerId: uid,
      title: title.trim(),
      description: description || "",
      price: typeof price === "number" ? price : Number(price) || 0,
      location: location || "",
      images: safeImages,                     // ✅ IMAGE FIX
      allowPayAtHotel: !!allowPayAtHotel,    // ✅ PAY AT HOTEL FIX
      metadata: metadata || {},
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
