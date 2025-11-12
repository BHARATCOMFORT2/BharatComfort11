// ✅ Force Node.js runtime (disable static/edge optimization)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * 🔹 GET /api/bookings/sync
 * Syncs the latest bookings for a logged-in user
 */
export async function GET(req: Request) {
  try {
    // ✅ Initialize Firebase Admin lazily
    const { db } = getFirebaseAdmin();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const idToken = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(idToken);

    const snap = await db
      .collection("bookings")
      .where("userId", "==", decoded.uid)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error("❌ Booking sync error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to sync bookings", details: error.message },
      { status: 500 }
    );
  }
}
