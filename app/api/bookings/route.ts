import { NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const bearer = req.headers.get("authorization") || "";
    const token = bearer.startsWith("Bearer ") ? bearer.split(" ")[1] : null;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = await admin.auth().verifyIdToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const currentUserId = decoded.uid;
    const body = await req.json();
    const { listingId, startDate, endDate } = body;

    if (!listingId || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    const bookingRef = adminDb.collection("bookings").doc();
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
