import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";

/**
 * GET /api/refunds
 * - Admin: see all refunds
 * - Partner: refunds for their bookings
 * - User: refunds for their bookings only
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
    const role = (decoded as any).role || "user";

    // ✅ Use Admin SDK query methods
    const refundsRef = db.collection("refunds");
    let queryRef: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

    if (role === "admin") {
      queryRef = refundsRef.orderBy("createdAt", "desc");
    } else if (role === "partner") {
      queryRef = refundsRef
        .where("partnerId", "==", uid)
        .orderBy("createdAt", "desc");
    } else {
      queryRef = refundsRef
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc");
    }

    const snap = await queryRef.get();
    const refunds = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, refunds });
  } catch (error: any) {
    console.error("❌ Error fetching refunds:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch refunds" },
      { status: 500 }
    );
  }
}
