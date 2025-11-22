// app/api/admin/partners/list/route.ts

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // --------------------------------
    // 1) Extract Firebase session cookie
    // --------------------------------
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // --------------------------------
    // 2) Verify admin session
    // --------------------------------
    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    if (!decoded.admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // --------------------------------
    // 3) Filters (status, kycStatus)
    // --------------------------------
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

    // --------------------------------
    // 4) Safe ordering
    // --------------------------------
    // Prefer createdAt, else updatedAt
    q = q.orderBy("createdAt", "desc");

    const snap = await q.get();

    const partners = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        partnerId: doc.id,
        name: data.name || null,
        email: data.email || null,
        phone: data.phone || null,
        businessName: data.businessName || null,
        status: data.status || "UNKNOWN",
        kycStatus: data.kycStatus || "NOT_STARTED",
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
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
