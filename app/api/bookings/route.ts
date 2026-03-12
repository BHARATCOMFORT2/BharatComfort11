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
      q = adminDb
        .collection("bookings")
        .orderBy("createdAt", "desc");
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
      bookings: snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })),
    });
  },
  { requireRole: ["user", "partner", "admin"] }
);

/* ---------------------------------------------------------
   POST — Create Booking
--------------------------------------------------------- */
export const POST = withAuth(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;

    const userId = decoded.uid;

    const body = await req.json().catch(() => ({}));

    const {
      listingId,
      checkIn,
      checkOut,
      paymentMode = "razorpay",
    } = body;

    if (!listingId || !checkIn || !checkOut) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------
       1️⃣ Get Listing
    --------------------------------------------------------- */

    const listingSnap = await adminDb
      .collection("listings")
      .doc(listingId)
      .get();

    if (!listingSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );
    }

    const listing = listingSnap.data();

    const ownerId = listing.ownerId || listing.partnerId || null;

    const ownerType =
      listing.ownerType || (listing.partnerId ? "partner" : "admin");

    const partnerId = listing.partnerId || null;

    const price = Number(listing.price || 0);

    if (!price) {
      return NextResponse.json(
        { success: false, error: "Listing price missing" },
        { status: 400 }
      );
    }

    const allowPayAtHotel = listing.allowPayAtHotel ?? false;

    /* ---------------------------------------------------------
       2️⃣ Prevent Overbooking
    --------------------------------------------------------- */

    const existingBookings = await adminDb
      .collection("bookings")
      .where("listingId", "==", listingId)
      .where("status", "in", ["confirmed", "confirmed_unpaid"])
      .get();

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    for (const doc of existingBookings.docs) {
      const b = doc.data();

      const bookedStart = new Date(b.checkIn);
      const bookedEnd = new Date(b.checkOut);

      if (start <= bookedEnd && end >= bookedStart) {
        return NextResponse.json(
          { success: false, error: "Selected dates already booked" },
          { status: 409 }
        );
      }
    }

    /* ---------------------------------------------------------
       3️⃣ Calculate Amount
    --------------------------------------------------------- */

    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
        86400000
    );

    const amount = nights * price;

    /* ---------------------------------------------------------
       4️⃣ Determine Booking Status
    --------------------------------------------------------- */

    let bookingStatus = "pending_payment";
    let paymentStatus = "pending";

    if (paymentMode === "pay_at_hotel") {
      if (!allowPayAtHotel) {
        return NextResponse.json(
          { success: false, error: "Pay-at-hotel not allowed" },
          { status: 403 }
        );
      }

      bookingStatus = "confirmed_unpaid";
      paymentStatus = "unpaid";
    }

    /* ---------------------------------------------------------
       5️⃣ Create Booking
    --------------------------------------------------------- */

    const bookingRef = await adminDb.collection("bookings").add({
      userId,
      userEmail: decoded?.email || null,

      listingId,

      ownerId,
      ownerType,

      partnerId,

      amount,

      checkIn,
      checkOut,

      paymentMode,

      paymentStatus,
      status: bookingStatus,

      refundStatus: "none",

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    /* ---------------------------------------------------------
       6️⃣ Razorpay Order
    --------------------------------------------------------- */

    let razorpayOrderId = null;

    if (paymentMode === "razorpay") {
      const { createRazorpayOrder } = await import(
        "@/lib/payments-razorpay-server"
      );

      const order = await createRazorpayOrder({
        amount,
        receipt: bookingRef.id,
      });

      razorpayOrderId = order.id;

      await bookingRef.update({
        razorpayOrderId,
      });
    }

    return NextResponse.json({
      success: true,
      bookingId: bookingRef.id,
      razorpayOrderId,
      paymentMode,
    });
  },
  { requireRole: ["user", "partner", "admin"] }
);

/* ---------------------------------------------------------
   PUT — Update Booking (Admin / Partner)
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

    const updates: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    await adminDb
      .collection("bookings")
      .doc(bookingId)
      .update(updates);

    return NextResponse.json({
      success: true,
      updates,
    });
  },
  { requireRole: ["admin", "partner"] }
);
