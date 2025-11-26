import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";
import { hotels, restaurants } from "../../../../data/sampleListings";

export async function POST() {
  try {
    const batch = adminDb.batch();

    hotels.forEach((hotel) => {
      const ref = adminDb.collection("listings").doc(hotel.id);
      batch.set(ref, { ...hotel, category: "hotel" });
    });

    restaurants.forEach((res) => {
      const ref = adminDb.collection("listings").doc(res.id);
      batch.set(ref, { ...res, category: "restaurant" });
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "✅ 40 Sample Listings Seeded Successfully"
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Seed Failed" }, { status: 500 });
  }
}
