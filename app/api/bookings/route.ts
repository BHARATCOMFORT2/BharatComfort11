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
    const role = decoded?.role || (decoded?.admin ? "admin" : decoded?.partner ? "partner" : "user");

    let query;

    if (role === "admin") {
      query = adminDb.collection("bookings").orderBy("createdAt", "desc");
    } else if (role === "partner") {
      query = adminDb
        .collection("bookings")
        .where("partnerId", "==", uid)
        .orderBy("createdAt", "desc");
    } else {
      query = adminDb
        .collection("bookings")
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc");
    }

    const snap = await query.get();
    return NextResponse.json({
      success: true,
      bookings: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  },
  { requireRole: ["user", "partner", "admin"] }
);

/* ---------------------------------------------------------
   POST — Create PAY-AT-HOTEL Booking Only
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

    const listingSnap = await adminDb.collection("listings").doc(listingId).get();
    if (!listingSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );
    }

    const listing = listingSnap.data();
    const allowPayAtHotel = listing.allowPayAtHotel ?? false;

    if (paymentMode !== "pay_at_hotel") {
      return NextResponse.json(
        {
          success: false,
          error:
            "For online payments, use /api/payments/create-order then /verify.",
          code: "USE_CREATE_ORDER",
        },
        { status: 400 }
      );
    }

    if (!allowPayAtHotel) {
      return NextResponse.json(
        { success: false, error: "Listing does not allow pay-at-hotel" },
        { status: 403 }
      );
    }

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

    return NextResponse.json({
      success: true,
      bookingId: bookingRef.id,
      paymentMode: "pay_at_hotel",
      message: "Booking created successfully.",
    });
  },
  { requireRole: ["user", "partner", "admin"] }
);

/* ---------------------------------------------------------
   PUT — Update Booking (admin & partner only)
--------------------------------------------------------- */
export const PUT = withAuth(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;
    const role = decoded?.role || (decoded.admin ? "admin" : decoded.partner ? "partner" : "user");

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
