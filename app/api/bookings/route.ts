export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { wrapRoute } from "@/lib/universal-wrapper";
import { FieldValue } from "firebase-admin/firestore";

/**
 * GET: list bookings
 * POST: create booking for pay_at_hotel only (online payments -> use create-order/verify)
 * PUT: update booking status (admin / partner)
 */

/* ---------- GET ---------- */
export const GET = wrapRoute(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;
    const uid = decoded?.uid;
    const role = (decoded?.role || "user").toString();

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
    const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, bookings });
  },
  { requireAuth: true }
);

/* ---------- POST ---------- */
export const POST = wrapRoute(
  async (req, ctx) => {
    const { adminDb, uid: userId, decoded } = ctx;
    const body = await req.json().catch(() => ({}));

    const {
      listingId,
      partnerId,
      amount,
      checkIn,
      checkOut,
      paymentMode = "razorpay",
      // In hybrid mode: if client wants a pay_at_hotel booking, call this endpoint with paymentMode="pay_at_hotel"
    } = body;

    if (!listingId || !partnerId || !amount || !checkIn || !checkOut) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Confirm listing exists & allows pay_at_hotel if requested
    const listingSnap = await adminDb.collection("listings").doc(listingId).get();
    if (!listingSnap.exists) {
      return NextResponse.json({ success: false, error: "Listing not found" }, { status: 404 });
    }
    const listing = listingSnap.data() || {};
    const allowPayAtHotel = !!listing.allowPayAtHotel;

    if (paymentMode !== "pay_at_hotel") {
      // For online payments we instruct client to use /api/payments/create-order flow
      return NextResponse.json({
        success: false,
        error:
          "For online payments, use /api/payments/create-order to create a Razorpay order, then verify.",
        code: "USE_CREATE_ORDER",
      }, { status: 400 });
    }

    if (!allowPayAtHotel) {
      return NextResponse.json({
        success: false,
        error: "Listing does not allow pay-at-hotel",
      }, { status: 403 });
    }

    // Create pay-at-hotel booking
    const now = FieldValue.serverTimestamp();
    const bookingData = {
      userId,
      userEmail: decoded?.email || null,
      partnerId,
      listingId,
      amount: Number(amount),
      checkIn,
      checkOut,
      paymentMode: "pay_at_hotel",
      paymentStatus: "unpaid",
      status: "confirmed_unpaid",
      refundStatus: "none",
      razorpayOrderId: null,
      createdAt: now,
      updatedAt: now,
    };

    const bookingRef = await adminDb.collection("bookings").add(bookingData);

    // Optionally generate invoice & email code could be added here (mirror create-order flow)
    return NextResponse.json({
      success: true,
      bookingId: bookingRef.id,
      paymentMode: "pay_at_hotel",
      message: "Booking created for pay-at-hotel",
    });
  },
  { requireAuth: true }
);

/* ---------- PUT ---------- */
export const PUT = wrapRoute(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;
    const role = (decoded?.role || "user").toString();

    // Only admin or partner allowed to change booking outside user
    if (!["admin", "partner"].includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { bookingId, status, paymentStatus } = body;

    if (!bookingId) {
      return NextResponse.json({ success: false, error: "bookingId required" }, { status: 400 });
    }

    const updates: any = { updatedAt: FieldValue.serverTimestamp() };
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    await adminDb.collection("bookings").doc(bookingId).update(updates);

    return NextResponse.json({ success: true, updates });
  },
  { requireAuth: true }
);
