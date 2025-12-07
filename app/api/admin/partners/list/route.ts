export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    /* --------------------------------
       1️⃣ Extract Firebase Session Cookie
    -------------------------------- */
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    /* --------------------------------
       2️⃣ Verify Session Cookie
    -------------------------------- */
    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded?.uid) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const adminUid = decoded.uid;

    /* --------------------------------
       3️⃣ Verify Admin from Firestore
    -------------------------------- */
    const adminSnap = await adminDb.collection("users").doc(adminUid).get();

    if (!adminSnap.exists || adminSnap.data()?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    /* --------------------------------
       4️⃣ Filters (status, kycStatus)
    -------------------------------- */
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status");
    const kycFilter = url.searchParams.get("kycStatus");

    let q: FirebaseFirestore.Query = adminDb.collection("partners");

    if (statusFilter) {
      q = q.where("status", "==", statusFilter);
    }

    if (kycFilter) {
      q = q.where("kycStatus", "==", kycFilter);
    }

    /* --------------------------------
       5️⃣ SAFE Ordering
       ✅ Order by updatedAt first
       ✅ If missing, UI fallback will handle
    -------------------------------- */
    q = q.orderBy("updatedAt", "desc");

    const snap = await q.get();

    const partners = snap.docs.map((doc) => {
      const data = doc.data() || {};

      return {
        partnerId: doc.id,
        name: data.name || null,
        email: data.email || null,
        phone: data.phone || null,
        businessName: data.businessName || null,
        status: data.status || "UNKNOWN",
        kycStatus: data.kycStatus || "NOT_STARTED",
        approved: data.approved || false,

        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      };
    });

    return NextResponse.json({
      success: true,
      total: partners.length,
      partners,
    });
  } catch (err: any) {
    console.error("🔥 Admin partner list error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
