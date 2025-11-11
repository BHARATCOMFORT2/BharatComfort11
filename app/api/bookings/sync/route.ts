import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const idToken = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(idToken);

    const snap = await db
      .collection("bookings")
      .where("userId", "==", decoded.uid)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("❌ Booking sync error:", error);
    return NextResponse.json({ ok: false, error: "Failed to sync bookings" }, { status: 500 });
  }
}
