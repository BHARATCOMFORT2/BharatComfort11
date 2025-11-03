import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";

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

    const refundsRef = collection(db, "refunds");
    let q;

    if (role === "admin") {
      q = query(refundsRef, orderBy("createdAt", "desc"));
    } else if (role === "partner") {
      q = query(refundsRef, where("partnerId", "==", uid), orderBy("createdAt", "desc"));
    } else {
      q = query(refundsRef, where("userId", "==", uid), orderBy("createdAt", "desc"));
    }

    const snap = await getDocs(q);
    const refunds = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ success: true, refunds });
  } catch (error) {
    console.error("Error fetching refunds:", error);
    return NextResponse.json(
      { error: "Failed to fetch refunds" },
      { status: 500 }
    );
  }
}
