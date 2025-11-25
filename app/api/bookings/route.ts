// app/api/bookings/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/universal-wrapper";
import { FieldValue } from "firebase-admin/firestore";

/* ---------------------------------------------------------
   GET — Fetch Bookings
--------------------------------------------------------- */
export const GET = withAuth(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;
    const uid = decoded?.uid;

    const role =
      decoded?.role ||
      (decoded.admin ? "admin" : decoded.partner ? "partner" : "user");

    let q;

    if (role === "admin") {
      q = adminDb.collection("bookings").orderBy("createdAt", "desc");
    } else if (role === "partner") {
      q = adminDb
        .collection("bookings")
        .where("partnerId", "==", uid)
        .orderBy("createdAt", "desc");
    } else {
      q = adminDb
        .collection("bookings")
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc");
    }

    const snap = await q.get();
    return NextResponse.json({
      success: true,
      bookings: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  },
  { requireRole: ["user", "partner", "admin"] }
);

/* ---------------------------------------------------------
   POST — Create booking (supports BOTH payment modes)
--------------------------------------------------------- */
export const POST = withAuth(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;
    const userId = decoded.uid;

    const body = await req.json().catch(() => ({}));
    const {
      listingId,
      partnerId,
      amount,
      checkIn,
      checkOut,
      paymentMode = "razorpay",
    } = body;

    if (!listingId || !partnerId || !amount || !checkIn || !checkOut) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate listing exists
    const listingSnap = await adminDb.collection("listings").doc(listingId).get();
    if (!listingSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );
    }

    const listing = listingSnap.data();
    const allowPayAtHotel = listing.allowPayAtHotel ?? false;

    const now = FieldValue.serverTimestamp();

    let bookingStatus = "pending_payment";
    let paymentStatus = "pending";

    if (paymentMode === "pay_at_hotel") {
      if (!allowPayAtHotel) {
        return NextResponse.json(
          { success: false, error: "Listing does not allow pay-at-hotel" },
          { status: 403 }
        );
      }

      bookingStatus = "confirmed_unpaid";
      paymentStatus = "unpaid";
    }

    // Create booking FIRST (matches your UI flow)
    const bookingData = {
      userId,
      userEmail: decoded?.email || null,
      partnerId,
      listingId,
      amount: Number(amount),
      checkIn,
      checkOut,
      paymentMode,
      paymentStatus,
      status: bookingStatus,
      refundStatus: "none",
      razorpayOrderId: null,
      createdAt: now,
      updatedAt: now,
    };

    const bookingRef = await adminDb.collection("bookings").add(bookingData);

    return NextResponse.json({
      success: true,
      bookingId: bookingRef.id,
      paymentMode,
      message:
        paymentMode === "pay_at_hotel"
          ? "Booking created (pay at hotel)."
          : "Booking created (pending payment).",
    });
  },
  { requireRole: ["user", "partner", "admin"] }
);

/* ---------------------------------------------------------
   PUT — Update Booking (admin / partner only)
--------------------------------------------------------- */
export const PUT = withAuth(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;
    const role =
      decoded?.role ||
      (decoded.admin ? "admin" : decoded.partner ? "partner" : "user");

    if (!["admin", "partner"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { bookingId, status, paymentStatus } = body;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId required" },
        { status: 400 }
      );
    }

    const updates: any = { updatedAt: FieldValue.serverTimestamp() };
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    await adminDb.collection("bookings").doc(bookingId).update(updates);

    return NextResponse.json({ success: true, updates });
  },
  { requireRole: ["admin", "partner"] }
);
