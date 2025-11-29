export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
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
        status: "ACTIVE",
        createdAt: new Date(),
      });
    });

    restaurants.forEach((res) => {
      const ref = adminDb.collection("listings").doc(res.id);
      batch.set(ref, {
        ...res,
        category: "restaurant",
        status: "ACTIVE",
        createdAt: new Date(),
      });
    });

    await batch.commit();

    // ✅ REAL DEBUG FROM SAME PROJECT
    const snap = await adminDb.collection("listings").get();

    return NextResponse.json({
      success: true,
      message: "✅ Sample listings seeded successfully!",
      totalSeeded: hotels.length + restaurants.length,
      totalDocsInListings: snap.size,
      firestoreProject: adminDb.app.options.projectId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Seed Failed" },
      { status: 500 }
    );
  }
}
