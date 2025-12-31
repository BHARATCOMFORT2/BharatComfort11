export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

/* ======================================================
   CREATE LISTING (ROOM-WISE PRICING READY)
====================================================== */

export async function POST(req: Request) {
  try {
    /* ======================================================
       1️⃣ AUTH
    ====================================================== */
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

    /* ======================================================
       2️⃣ PARTNER CHECK (NO KYC BLOCK)
       👉 KYC will be enforced before payouts, NOT listing creation
    ====================================================== */
    const partnerSnap = await adminDb.collection("partners").doc(uid).get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Partner profile not found" },
        { status: 403 }
      );
    }

    /* ======================================================
       3️⃣ BODY
    ====================================================== */
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
      location,
      images,
      allowPayAtHotel,
      rooms,        // ✅ NEW (ROOM-WISE DATA)
      metadata,
    } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { success: false, error: "title is required" },
        { status: 400 }
      );
    }

    /* ======================================================
       4️⃣ IMAGE SANITIZATION
    ====================================================== */
    const safeImages = Array.isArray(images)
      ? images.filter(
          (u: any) =>
            typeof u === "string" &&
            (u.startsWith("http://") || u.startsWith("https://"))
        )
      : [];

    /* ======================================================
       5️⃣ ROOMS + PRICING VALIDATION
    ====================================================== */
    const safeRooms = Array.isArray(rooms)
      ? rooms.map((r: any) => ({
          id: r.id || adminDb.collection("_").doc().id,
          name: typeof r.name === "string" ? r.name : "Room",
          totalRooms: Number(r.totalRooms) || 1,
          maxGuests: Number(r.maxGuests) || 2,

          pricing: {
            basePrice: Number(r.pricing?.basePrice) || 0,
            weekendPrice: Number(r.pricing?.weekendPrice) || null,
            festivalPrice: Number(r.pricing?.festivalPrice) || null,
            discountPercent: Number(r.pricing?.discountPercent) || 0,
            minStayNights: Number(r.pricing?.minStayNights) || 1,
          },

          availability: Array.isArray(r.availability)
            ? r.availability
            : [],
        }))
      : [];

    /* ======================================================
       6️⃣ CREATE LISTING
    ====================================================== */
    const docRef = adminDb.collection("listings").doc();

    const payload = {
      id: docRef.id,
      partnerId: uid,

      title: title.trim(),
      description: description || "",
      location: location || "",

      images: safeImages,
      allowPayAtHotel: !!allowPayAtHotel,

      rooms: safeRooms,           // ✅ ROOM-WISE STRUCTURE
      metadata: metadata || {},

      status: "DRAFT",            // ✅ DEFAULT
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
