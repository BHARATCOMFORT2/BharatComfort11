// app/api/bookings/route.ts
import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    // --- Authenticate ---
    const bearer = req.headers.get("authorization") || "";
    const token = bearer.startsWith("Bearer ") ? bearer.split(" ")[1] : null;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    // currentUser = decoded
    const currentUserId = decoded.uid;

    // --- Parse body ---
    const body = await req.json();
    const { listingId, startDate, endDate } = body;

    if (!listingId || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // --- Save booking ---
    const bookingRef = admin.firestore().collection("bookings").doc();
    await bookingRef.set({
      id: bookingRef.id,
      userId: currentUserId,
      listingId,
      startDate,
      endDate,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, bookingId: bookingRef.id });
  } catch (err: any) {
    console.error("Booking error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
