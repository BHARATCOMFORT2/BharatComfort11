export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import "server-only";
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { generateBookingInvoice } from "@/lib/invoices/generateBookingInvoice";
import { sendEmail } from "@/lib/email";
import { uploadInvoiceToFirebase } from "@/lib/storage/uploadInvoice";

/* -------------------------------------------------------
   SESSION COOKIE HELPERS
------------------------------------------------------- */
function extractSessionCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  return cookies.find((c) => c.startsWith("__session="))?.split("=")[1] || "";
}

async function verifySession(req: Request) {
  const { adminAuth } = getFirebaseAdmin();
  const cookie = extractSessionCookie(req);
  if (!cookie) return null;

  try {
    return await adminAuth.verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}

const unauthorized = () =>
  NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

const forbidden = () =>
  NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

/* -------------------------------------------------------
   GET — Fetch User/Partner/Admin Bookings
------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const decoded = await verifySession(req);
    if (!decoded) return unauthorized();

    const { adminDb } = getFirebaseAdmin();
    const uid = decoded.uid;
    const role = decoded.role || "user";

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
  } catch (err) {
    console.error("❌ GET bookings error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------
   POST — Create Booking (Unified)
------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const decoded = await verifySession(req);
    if (!decoded) return unauthorized();

    const uid = decoded.uid;
    const userEmail = decoded.email || "";

    const { adminDb, admin } = getFirebaseAdmin();
    const body = await req.json();

    const {
      listingId,
      partnerId,
      amount,
      checkIn,
      checkOut,
      paymentMode = "razorpay",
      razorpayOrderId = null,
    } = body;

    /* ---------- VALIDATION ---------- */
    if (!listingId || !partnerId || !amount || !checkIn || !checkOut) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    /* ---------- GET LISTING ---------- */
    const listingSnap = await adminDb.collection("listings").doc(listingId).get();
    if (!listingSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );
    }

    const listing = listingSnap.data()!;
    const allowPayAtHotel = listing.allowPayAtHotel ?? false;

    if (paymentMode === "pay_at_hotel" && !allowPayAtHotel) {
      return forbidden();
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    /* ---------- BOOKING DATA ---------- */
    const bookingData = {
      userId: uid,
      userEmail,
      partnerId,
      listingId,
      amount: Number(amount),
      checkIn,
      checkOut,
      paymentMode,
      paymentStatus: paymentMode === "razorpay" ? "pending" : "unpaid",
      status: paymentMode === "razorpay" ? "pending_payment" : "confirmed_unpaid",
      refundStatus: "none",
      razorpayOrderId,
      createdAt: now,
      updatedAt: now,
    };

    /* ---------- SAVE BOOKING ---------- */
    const bookingRef = await adminDb.collection("bookings").add(bookingData);
    const bookingId = bookingRef.id;

    /* ---------------------------------------------------
       PAY-AT-HOTEL (Generate Invoice Immediately)
    --------------------------------------------------- */
    if (paymentMode !== "razorpay") {
      const paymentId = razorpayOrderId || `PAYLATER-${bookingId}`;

      const pdf = await generateBookingInvoice({
        bookingId,
        userId: uid,
        paymentId,
        amount: Number(amount),
      });

      const invoiceUrl =
        typeof pdf === "string"
          ? pdf
          : await uploadInvoiceToFirebase(pdf, `INV-${bookingId}`, "booking");

      await adminDb.collection("invoices").add({
        bookingId,
        userId: uid,
        partnerId,
        amount: Number(amount),
        paymentMode,
        status: "unpaid",
        invoiceUrl,
        createdAt: now,
      });

      if (userEmail) {
        try {
          await sendEmail(
            userEmail,
            "BHARATCOMFORT11 — Booking Confirmed",
            `Your booking is confirmed. Amount ₹${amount}.`
          );
        } catch (e) {
          console.warn("Email error", e);
        }
      }
    }

    /* ---------------------------------------------------
       RESPONSE
    --------------------------------------------------- */
    return NextResponse.json({
      success: true,
      bookingId,
      paymentMode,
      status:
        paymentMode === "razorpay" ? "pending_payment" : "confirmed_unpaid",
    });
  } catch (err) {
    console.error("❌ Create booking error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------
   PUT — Update Booking (Admin/Partner)
------------------------------------------------------- */
export async function PUT(req: Request) {
  try {
    const decoded = await verifySession(req);
    if (!decoded) return unauthorized();

    const role = decoded.role || "user";
    if (!["admin", "partner"].includes(role)) return forbidden();

    const { adminDb, admin } = getFirebaseAdmin();
    const body = await req.json();

    const { bookingId, status, paymentStatus } = body;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId required" },
        { status: 400 }
      );
    }

    const updates: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    await adminDb.collection("bookings").doc(bookingId).update(updates);

    return NextResponse.json({ success: true, updates });
  } catch (err) {
    console.error("❌ Update booking error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
