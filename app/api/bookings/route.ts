export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import "server-only";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { generateBookingInvoice } from "@/lib/invoices/generateBookingInvoice";
import { sendEmail } from "@/lib/email";
import { uploadInvoiceToFirebase } from "@/lib/storage/uploadInvoice";

type Role = "admin" | "partner" | "user";

/**
 * NOTE:
 * - always use getFirebaseAdmin() to avoid cold-start undefined exports
 * - use admin.firestore.FieldValue.serverTimestamp() for createdAt/updatedAt
 * - detect Firestore "requires index" errors and return an actionable message
 */

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */
function makeUnauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function makeForbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/* -------------------------------------------------------------------------- */
/*                                   ROUTES                                    */
/* -------------------------------------------------------------------------- */

/**
 * 🔹 GET /api/bookings
 * - Admin: all bookings
 * - Partner: their bookings
 * - User: their bookings
 *
 * Expects Authorization: Bearer <ID_TOKEN>
 */
export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return makeUnauthorized();

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return makeUnauthorized();

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = (decoded as any).uid;
    const role = ((decoded as any).role as Role) || "user";

    const col = adminDb.collection("bookings");

    // Build query based on role
    let q:
      | FirebaseFirestore.Query<FirebaseFirestore.DocumentData>
      | undefined = undefined;

    if (role === "admin") {
      q = col.orderBy("createdAt", "desc");
    } else if (role === "partner") {
      q = col.where("partnerId", "==", uid).orderBy("createdAt", "desc");
    } else {
      q = col.where("userId", "==", uid).orderBy("createdAt", "desc");
    }

    // Execute and map results
    const snap = await q.get();
    const bookings = snap.docs.map((d) => {
      const data = d.data() || {};
      // ensure id exists on returned object
      return { ...data, id: data.id || d.id };
    });

    return NextResponse.json({ success: true, bookings });
  } catch (err: any) {
    console.error("Error fetching bookings:", err);

    // Firestore composite index required -> surface helpful message (not just 500)
    const msg = String(err.message || err);
    if (msg.toLowerCase().includes("index")) {
      // Return a 400 with guidance so you can click the console-provided link
      return NextResponse.json(
        {
          error:
            "Firestore requires a composite index for this query. Create the index in Firebase Console (see build logs / error message for the exact link).",
          details: msg,
        },
        { status: 400 }
      );
    }

    // Permission issues
    if (msg.toLowerCase().includes("permission-denied")) {
      return NextResponse.json(
        { error: "Permission denied — check Firestore rules for this collection" },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

/**
 * 🔹 POST /api/bookings
 * Body: { listingId, partnerId, amount, checkIn, checkOut, paymentMode, razorpayOrderId? }
 * Expects Authorization: Bearer <ID_TOKEN>
 */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return makeUnauthorized();

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return makeUnauthorized();

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = (decoded as any).uid;
    const userEmail = (decoded as any).email || "";

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

    // Validate listing exists
    const listingSnap = await adminDb.collection("listings").doc(listingId).get();
    if (!listingSnap.exists) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    const listing = listingSnap.data() as any;
    const allowPayAtHotel = listing?.allowPayAtHotel ?? false;
    const allowPayAtRestaurant = listing?.allowPayAtRestaurant ?? false;

    if (
      (paymentMode === "pay_at_hotel" && !allowPayAtHotel) ||
      (paymentMode === "pay_at_restaurant" && !allowPayAtRestaurant)
    ) {
      return NextResponse.json(
        {
          error:
            "This listing does not allow the selected pay-at-property option",
        },
        { status: 403 }
      );
    }

    // Use server timestamps
    const now = admin.firestore.FieldValue.serverTimestamp();
    const status = paymentMode === "razorpay" ? "pending_payment" : "confirmed_unpaid";
    const paymentStatus = paymentMode === "razorpay" ? "pending" : "unpaid";

    const bookingData: Record<string, any> = {
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

    // Generate invoice for pay-at-property flows
    if (paymentMode === "pay_at_hotel" || paymentMode === "pay_at_restaurant") {
      const paymentId =
        (typeof razorpayOrderId === "string" && razorpayOrderId) ||
        `PAYLATER-${bookingId}`;

      const out: any = await generateBookingInvoice({
        bookingId,
        userId: uid,
        paymentId,
        amount: Number(amount),
      });

      let invoiceUrl = "";
      if (typeof out === "string") {
        // returns a URL directly
        invoiceUrl = out;
      } else if (out && typeof out.byteLength === "number") {
        const invoiceId = `INV-BK-${Date.now()}`;
        invoiceUrl = await uploadInvoiceToFirebase(out as Buffer, invoiceId, "booking");
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

      // Best-effort emails (don't fail booking on email error)
      try {
        if (userEmail) {
          await sendEmail(
            userEmail,
            "BHARATCOMFORT11 — Booking Confirmed (Pay at Property)",
            `
              <p>Your booking for <b>${listing?.name || "listing"}</b> has been confirmed.</p>
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
        if (listing?.partnerEmail) {
          await sendEmail(
            listing.partnerEmail,
            "BHARATCOMFORT11 — New Pay-at-Property Booking",
            `
              <p>New booking received for <b>${listing?.name || "listing"}</b>.</p>
              <p>Booking ID: ${bookingId}</p>
              <p>User will pay at the property upon arrival.</p>
            `
          );
        }
      } catch (emailErr) {
        console.warn("Email sending failed:", emailErr);
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
  } catch (err: any) {
    console.error("Error creating booking:", err);

    // detect Firestore index requirement messages
    const message = String(err.message || err);
    if (message.toLowerCase().includes("index")) {
      return NextResponse.json(
        {
          error:
            "Firestore requires a composite index for this operation. Create the recommended index in the Firebase Console (see build logs / error message link).",
          details: message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

/**
 * 🔹 PUT /api/bookings
 * Used for admin/partner updates (mark paid, update status)
 * Expects Authorization: Bearer <ID_TOKEN>
 */
export async function PUT(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return makeUnauthorized();

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return makeUnauthorized();

    const decoded = await adminAuth.verifyIdToken(token);
    const role = ((decoded as any).role as Role) || "user";
    if (!["admin", "partner"].includes(role)) return makeForbidden();

    const { bookingId, status, paymentStatus } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const updates: Record<string, any> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    await adminDb.collection("bookings").doc(bookingId).update(updates);
    return NextResponse.json({ success: true, updates });
  } catch (err: any) {
    console.error("Error updating booking:", err);

    if (String(err.message || "").toLowerCase().includes("permission-denied")) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
