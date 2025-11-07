export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import "server-only";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebaseadmin";
import { generateBookingInvoice } from "@/lib/invoices/generateBookingInvoice";
import { sendEmail } from "@/lib/email";
import { uploadInvoiceToFirebase } from "@/lib/storage/uploadInvoice"; // used if invoice generator returns a Buffer

type Role = "admin" | "partner" | "user";

/**
 * 🔹 GET /api/bookings
 * - Admin: all bookings
 * - Partner: their bookings
 * - User: their bookings
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;
    const role = (decoded as any).role as Role || "user";

    const col = adminDb.collection("bookings");
    // ✅ Start as a Query to avoid TS mismatch
    let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = col;

    if (role === "admin") {
      q = col.orderBy("createdAt", "desc");
    } else if (role === "partner") {
      q = col.where("partnerId", "==", uid).orderBy("createdAt", "desc");
    } else {
      q = col.where("userId", "==", uid).orderBy("createdAt", "desc");
    }

    const snap = await q.get();
    const bookings = snap.docs.map((d) => {
      const data = d.data() || {};
      return { ...data, id: data.id || d.id }; // ✅ don't overwrite id if present in data
    });

    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

/**
 * 🔹 POST /api/bookings
 * Creates a new booking document
 * Body: { listingId, partnerId, amount, checkIn, checkOut, paymentMode, razorpayOrderId? }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;
    const userEmail = decoded.email || "";

    const {
      listingId,
      partnerId,
      amount,
      checkIn,
      checkOut,
      paymentMode = "razorpay",
      razorpayOrderId = null,
    } = await req.json();

    if (!listingId || !partnerId || !amount || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate listing + pay-at-property flags
    const listingSnap = await adminDb.collection("listings").doc(listingId).get();
    if (!listingSnap.exists) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    const listing = listingSnap.data() as any;
    const allowPayAtHotel = listing.allowPayAtHotel ?? false;
    const allowPayAtRestaurant = listing.allowPayAtRestaurant ?? false;

    if (
      (paymentMode === "pay_at_hotel" && !allowPayAtHotel) ||
      (paymentMode === "pay_at_restaurant" && !allowPayAtRestaurant)
    ) {
      return NextResponse.json(
        { error: "This listing does not allow the selected pay-at-property option" },
        { status: 403 }
      );
    }

    const now = new Date();
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

    // 🔹 Generate unpaid invoice for Pay-at-Property flows
    if (paymentMode === "pay_at_hotel" || paymentMode === "pay_at_restaurant") {
      const maybeUrlOrBuffer = await generateBookingInvoice({
        bookingId,
        userEmail,
        listingName: listing.name,
        amount: Number(amount),
        status: "Unpaid (Pay at Property)",
        paymentMode: paymentMode === "pay_at_hotel" ? "Pay at Hotel" : "Pay at Restaurant",
      });

      // The generator may return a URL or a Buffer — handle both:
      let invoiceUrl = "";
      if (typeof maybeUrlOrBuffer === "string") {
        invoiceUrl = maybeUrlOrBuffer;
      } else if (maybeUrlOrBuffer && typeof (maybeUrlOrBuffer as any).byteLength === "number") {
        const invoiceId = `INV-BK-${Date.now()}`;
        invoiceUrl = await uploadInvoiceToFirebase(
          maybeUrlOrBuffer as Buffer,
          invoiceId,
          "booking"
        );
      }

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

      // Best-effort emails
      try {
        if (userEmail) {
          await sendEmail(
            userEmail,
            "BHARATCOMFORT11 — Booking Confirmed (Pay at Property)",
            `
              <p>Your booking for <b>${listing.name}</b> has been confirmed.</p>
              <p>You have chosen <b>${
                paymentMode === "pay_at_hotel" ? "Pay at Hotel" : "Pay at Restaurant"
              }</b>.</p>
              <p>Amount: ₹${Number(amount)}</p>
              ${
                invoiceUrl
                  ? `<p><a href="${invoiceUrl}" target="_blank" rel="noopener noreferrer">Download Invoice</a></p>`
                  : `<p>Your invoice will be available in your account shortly.</p>`
              }
            `
          );
        }
        if (listing.partnerEmail) {
          await sendEmail(
            listing.partnerEmail,
            "BHARATCOMFORT11 — New Pay-at-Property Booking",
            `
              <p>New booking received for <b>${listing.name}</b>.</p>
              <p>Booking ID: ${bookingId}</p>
              <p>User will pay at the property upon arrival.</p>
            `
          );
        }
      } catch (err) {
        console.warn("Email sending failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      bookingId,
      status,
      paymentMode,
      message:
        paymentMode === "razorpay"
          ? "Booking created. Proceed to payment."
          : "Booking confirmed. Pay at property.",
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

/**
 * 🔹 PUT /api/bookings
 * Used for admin/partner updates (mark paid, update status)
 */
export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role as Role || "user";
    if (!["admin", "partner"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { bookingId, status, paymentStatus } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    await adminDb.collection("bookings").doc(bookingId).update(updates);
    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
