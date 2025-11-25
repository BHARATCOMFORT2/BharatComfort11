// app/api/bookings/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/universal-wrapper";
import { FieldValue } from "firebase-admin/firestore";
import Razorpay from "razorpay";

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
   POST — Create booking (supports Razorpay + Pay at Hotel)
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
      paymentMode = "razorpay", // razorpay | pay_at_hotel
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
    let razorpayOrder = null;

    /* ---------------------------------------------------------
        CASE A — PAY AT HOTEL
    --------------------------------------------------------- */
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

    /* ---------------------------------------------------------
        CASE B — RAZORPAY PAYMENT
    --------------------------------------------------------- */
    if (paymentMode === "razorpay") {
      try {
        const razor = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID!,
          key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        const order = await razor.orders.create({
          amount: Number(amount) * 100,
          currency: "INR",
          receipt: `order_rcpt_${Date.now()}`,
        });

        razorpayOrder = order;
      } catch (err) {
        console.error("Razorpay Error:", err);
        return NextResponse.json(
          { success: false, error: "Razorpay order creation failed" },
          { status: 500 }
        );
      }
    }

    /* ---------------------------------------------------------
       CREATE BOOKING — common for both modes
    --------------------------------------------------------- */
    const bookingData = {
      userId,
      userEmail: decoded?.email || null,
      partnerId,
      listingId,
      amount: Number(amount),
      checkIn,
      checkOut,
      paymentMode,
      paymentStatus,         // pending / unpaid
      status: bookingStatus, // pending_payment / confirmed_unpaid
      refundStatus: "none",
      razorpayOrderId: razorpayOrder?.id || null,
      createdAt: now,
      updatedAt: now,
    };

    const bookingRef = await adminDb.collection("bookings").add(bookingData);

    return NextResponse.json({
      success: true,
      bookingId: bookingRef.id,
      paymentMode,
      razorpayOrder,
      message:
        paymentMode === "pay_at_hotel"
          ? "Booking created (Pay at Hotel)."
          : "Booking created (Razorpay pending payment).",
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
