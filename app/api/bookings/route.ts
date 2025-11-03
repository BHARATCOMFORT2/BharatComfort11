import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";

/**
 * GET /api/bookings
 * - Admin: all bookings
 * - Partner: their bookings
 * - User: their bookings
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;
    const role = (decoded as any).role || "user";

    const bookingsRef = collection(db, "bookings");
    let q;

    if (role === "admin") {
      q = query(bookingsRef, orderBy("createdAt", "desc"));
    } else if (role === "partner") {
      q = query(bookingsRef, where("partnerId", "==", uid), orderBy("createdAt", "desc"));
    } else {
      q = query(bookingsRef, where("userId", "==", uid), orderBy("createdAt", "desc"));
    }

    const snap = await getDocs(q);
    const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

/**
 * POST /api/bookings
 * Creates a new booking document
 * Body: {
 *   listingId, partnerId, amount, checkIn, checkOut,
 *   paymentMode ("razorpay" | "pay_at_hotel" | "pay_at_restaurant")
 * }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    } = await req.json();

    if (!listingId || !partnerId || !amount || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bookingsRef = collection(db, "bookings");
    let status = "pending_payment";
    let paymentStatus = "pending";

    // Adjust based on payment mode
    if (paymentMode === "razorpay") {
      status = "pending_payment";
      paymentStatus = "pending";
    } else if (paymentMode === "pay_at_hotel" || paymentMode === "pay_at_restaurant") {
      status = "confirmed_unpaid";
      paymentStatus = "unpaid";
    }

    const newBooking = {
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const bookingDoc = await addDoc(bookingsRef, newBooking);

    return NextResponse.json({
      success: true,
      bookingId: bookingDoc.id,
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
 * PUT /api/bookings
 * Used for admin/partner updates (mark paid, update status)
 * Body: { bookingId, status?, paymentStatus? }
 */
export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role || "user";

    if (!["admin", "partner"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { bookingId, status, paymentStatus } = await req.json();
    if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

    const bookingRef = doc(db, "bookings", bookingId);
    const updates: any = { updatedAt: serverTimestamp() };
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    await updateDoc(bookingRef, updates);

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
