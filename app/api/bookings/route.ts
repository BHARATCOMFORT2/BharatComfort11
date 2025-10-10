import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  const { adminDb } = getFirebaseAdmin();

  try {
    const data = await req.json();

    // ✅ Basic validation
    if (!data.userId || !data.partnerId || !data.listingId || !data.amount) {
      return NextResponse.json(
        { success: false, error: "Missing required booking fields." },
        { status: 400 }
      );
    }

    const newBooking = {
      ...data,
      status: "pending", // default until payment verified
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // ✅ Add booking document
    const docRef = await adminDb.collection("bookings").add(newBooking);

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (err: any) {
    console.error("Error creating booking:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
