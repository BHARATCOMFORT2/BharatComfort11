export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import "server-only";
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { generateBookingInvoice } from "@/lib/invoices/generateBookingInvoice";
import { sendEmail } from "@/lib/email";
import { uploadInvoiceToFirebase } from "@/lib/storage/uploadInvoice";

/* ------------------ COOKIE AUTH HELPERS ------------------ */
function extractSessionCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((c) => c.trim());

  return (
    cookies.find((c) => c.startsWith("__session="))?.split("=")[1] || ""
  );
}

async function verifySession(req: Request) {
  const { adminAuth } = getFirebaseAdmin();
  const session = extractSessionCookie(req);
  if (!session) return null;

  try {
    return await adminAuth.verifySessionCookie(session, true);
  } catch {
    return null;
  }
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/* ============================================================
   🔹 GET — Fetch Bookings (User / Partner / Admin)
============================================================ */
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

    const bookings = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, bookings });
  } catch (err: any) {
    console.error("❌ GET bookings error:", err);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

/* ============================================================
   🔹 POST — Create Booking
============================================================ */
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

    if (!listingId || !partnerId || !amount || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Validate listing
    const listingSnap = await adminDb.collection("listings").doc(listingId).get();
    if (!listingSnap.exists) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const listing = listingSnap.data()!;
    const allowPayAtHotel = listing.allowPayAtHotel ?? false;
    const allowPayAtRestaurant = listing.allowPayAtRestaurant ?? false;

    if (
      (paymentMode === "pay_at_hotel" && !allowPayAtHotel) ||
      (paymentMode === "pay_at_restaurant" && !allowPayAtRestaurant)
    ) {
      return forbidden();
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const status = paymentMode === "razorpay" ? "pending_payment" : "confirmed_unpaid";
    const paymentStatus = paymentMode === "razorpay" ? "pending" : "unpaid";

    const bookingData = {
      userId: uid,
      userEmail,
      partnerId,
      listingId,
      amount: Number(amount),
      checkIn,
      checkOut,
      paymentMode,
      paymentStatus,
      status,
      refundStatus: "none",
      razorpayOrderId,
      createdAt: now,
      updatedAt: now,
    };

    const bookingRef = await adminDb.collection("bookings").add(bookingData);
    const bookingId = bookingRef.id;

    // Pay-at-property invoice
    if (paymentMode !== "razorpay") {
      const paymentId =
        razorpayOrderId ||
        `PAYLATER-${bookingId}`;

      const pdf = await generateBookingInvoice({
        bookingId,
        userId: uid,
        paymentId,
        amount: Number(amount),
      });

      let invoiceUrl = "";
      if (typeof pdf === "string") invoiceUrl = pdf;
      else invoiceUrl = await uploadInvoiceToFirebase(pdf, `INV-${bookingId}`, "booking");

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

      // Send emails (wrapped in try)
      try {
        if (userEmail) {
          await sendEmail(
            userEmail,
            "BHARATCOMFORT11 — Booking Confirmed",
            `Your booking is confirmed. Amount ₹${amount}.`
          );
        }
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      bookingId,
      status,
      paymentMode,
    });
  } catch (err: any) {
    console.error("❌ Create booking error:", err);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

/* ============================================================
   🔹 PUT — Update Booking (admin / partner)
============================================================ */
export async function PUT(req: Request) {
  try {
    const decoded = await verifySession(req);
    if (!decoded) return unauthorized();

    const role = decoded.role || "user";
    if (!["admin", "partner"].includes(role)) return forbidden();

    const { adminDb, admin } = getFirebaseAdmin();

    const { bookingId, status, paymentStatus } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
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
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
