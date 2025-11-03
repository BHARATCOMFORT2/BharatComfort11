import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";

/**
 * POST /api/settlements/request
 * Partner initiates settlement from eligible bookings.
 *
 * Body:
 * {
 *   bookingIds: string[],
 *   totalAmount: number
 * }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;
    const role = (decoded as any).role || "partner";

    if (role !== "partner") {
      return NextResponse.json(
        { error: "Only partners can create settlement requests" },
        { status: 403 }
      );
    }

    const { bookingIds = [], totalAmount } = await req.json();

    if (!bookingIds.length || !totalAmount) {
      return NextResponse.json(
        { error: "bookingIds and totalAmount are required" },
        { status: 400 }
      );
    }

    // Verify bookings belong to this partner
    const bookingsRef = collection(db, "bookings");
    const q = query(bookingsRef, where("id", "in", bookingIds));
    const snap = await getDocs(q);

    const invalidBookings = snap.docs.filter(
      (d) => d.data().partnerId !== uid
    );
    if (invalidBookings.length > 0) {
      return NextResponse.json(
        { error: "One or more bookings do not belong to this partner" },
        { status: 403 }
      );
    }

    // Create new settlement entry
    const settlementsRef = collection(db, "settlements");
    const settlementDoc = await addDoc(settlementsRef, {
      partnerId: uid,
      partnerName: decoded.name || "",
      bookingIds,
      amount: Number(totalAmount),
      status: "pending",
      remark: "Awaiting admin review",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Mark all bookings as "settlement_requested"
    await Promise.all(
      bookingIds.map(async (bId: string) => {
        const ref = doc(db, "bookings", bId);
        await updateDoc(ref, { settlementStatus: "requested" });
      })
    );

    return NextResponse.json({
      success: true,
      settlementId: settlementDoc.id,
    });
  } catch (error) {
    console.error("Settlement request error:", error);
    return NextResponse.json(
      { error: "Failed to create settlement request" },
      { status: 500 }
    );
  }
}
