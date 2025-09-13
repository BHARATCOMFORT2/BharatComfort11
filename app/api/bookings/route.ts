import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { createRazorpayOrder } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { userId, listingId, amount, checkIn, checkOut } = await req.json();

    if (!userId || !listingId || !amount) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1. Create Razorpay order
    const razorpayOrder = await createRazorpayOrder(amount);

    // 2. Save temp order in Firestore
    await addDoc(collection(db, "orders"), {
      userId,
      listingId,
      orderId: razorpayOrder.id,
      amount,
      status: "pending",
      checkIn,
      checkOut,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ order: razorpayOrder });
  } catch (error: any) {
    console.error("Booking API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
