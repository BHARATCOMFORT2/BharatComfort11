export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

function getHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    const authHeader = getHeader(req);
    if (!authHeader)
      return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match)
      return NextResponse.json({ error: "Invalid Authorization header" }, { status: 401 });

    const token = match[1];

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token, true);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const uid = decoded.uid;
    const { bookingIds, totalAmount } = await req.json();

    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json({ error: "bookingIds is required" }, { status: 400 });
    }

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Verify partner & KYC approved
    const partnerSnap = await adminDb.collection("partners").doc(uid).get();
    if (!partnerSnap.exists) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    const partnerData = partnerSnap.data();
    if (partnerData.status !== "approved") {
      return NextResponse.json({ error: "KYC not approved" }, { status: 403 });
    }

    // Validate bookings
    const validatedBookings: any[] = [];
    for (const id of bookingIds) {
      const snap = await adminDb.collection("bookings").doc(id).get();
      if (!snap.exists) continue;
      const b = snap.data();

      if (b.partnerUid !== uid) {
        return NextResponse.json({ error: `Booking ${id} does not belong to this partner` }, { status: 403 });
      }

      validatedBookings.push({ id, amount: b.amount });
    }

    if (validatedBookings.length === 0) {
      return NextResponse.json({ error: "No valid bookings found" }, { status: 400 });
    }

    // Create settlement request
    const ref = adminDb.collection("settlements").doc();

    const payload = {
      id: ref.id,
      partnerUid: uid,
      bookings: validatedBookings,
      requestedAmount: totalAmount,
      status: "pending",
      requestedAt: new Date(),
    };

    await ref.set(payload);

    return NextResponse.json({ ok: true, settlementId: ref.id });
  } catch (err: any) {
    console.error("settlement request error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
