export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/reviews/add/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { serverTimestamp } from "firebase/firestore";

/**
 * POST /api/reviews/add
 * Adds a review for a listing or booking.
 *
 * Body:
 * {
 *   listingId: string,
 *   bookingId?: string,
 *   rating: number (1-5),
 *   comment: string
 * }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const { listingId, bookingId = "", rating, comment } = await req.json();
    if (!listingId || !rating)
      return NextResponse.json({ error: "listingId and rating required" }, { status: 400 });

    // Create a new review
    const docRef = db.collection("reviews").doc();
    await docRef.set({
      id: docRef.id,
      listingId,
      bookingId,
      userId: uid,
      userEmail: decoded.email || "",
      userName: decoded.name || "User",
      rating: Number(rating),
      comment: comment || "",
      status: "pending", // Admin approval needed
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: "Review submitted for approval" });
  } catch (err) {
    console.error("Review add error:", err);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
