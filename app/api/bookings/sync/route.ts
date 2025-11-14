// Force Node.js runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/* ------------------ Helper: Extract Session Cookie ------------------ */
function getSessionCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((c) => c.trim());

  return (
    cookies.find((c) => c.startsWith("__session="))?.split("=")[1] || ""
  );
}

/* ------------------ Helper: Verify Session Cookie ------------------ */
async function verifySession(req: Request) {
  try {
    const { adminAuth } = getFirebaseAdmin();
    const sessionCookie = getSessionCookie(req);
    if (!sessionCookie) return null;

    return await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}

/* ====================================================================
   🔹 GET /api/bookings/sync
   Fetches latest 10 bookings FOR LOGGED-IN USER (session-based)
==================================================================== */
export async function GET(req: Request) {
  try {
    const decoded = await verifySession(req);
    if (!decoded) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { adminDb } = getFirebaseAdmin();

    const snap = await adminDb
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
      {
        ok: false,
        error: "Failed to sync bookings",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
