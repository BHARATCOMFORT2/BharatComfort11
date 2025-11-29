export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// ✅ ✅ ✅ CORRECT RELATIVE PATH (IMPORTANT FIX)
import { hotels, restaurants } from "../../../../data/sampleListings";

export async function GET() {
  try {
    const { adminDb } = getFirebaseAdmin();

    const batch = adminDb.batch();

    hotels.forEach((hotel) => {
      const ref = adminDb.collection("listings").doc(hotel.id);
      batch.set(ref, {
        ...hotel,
        category: "hotel",
        status: "ACTIVE",      // ✅ normalize
        createdAt: new Date()  // ✅ required for ordering
      });
    });

    restaurants.forEach((res) => {
      const ref = adminDb.collection("listings").doc(res.id);
      batch.set(ref, {
        ...res,
        category: "restaurant",
        status: "ACTIVE",
        createdAt: new Date()
      });
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "✅ Sample listings seeded successfully!",
      hotels: hotels.length,
      restaurants: restaurants.length,
      total: hotels.length + restaurants.length,
    });
  } catch (err: any) {
    console.error("Seed Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Seed Failed" },
      { status: 500 }
    );
  }
}
