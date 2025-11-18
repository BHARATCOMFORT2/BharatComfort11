// app/api/admin/partners/list/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    const cookieHeader = req.headers.get("cookie") || "";

    // Read session cookie set by /api/auth/session
    const sessionCookie =
      cookieHeader
        .split(";")
        .find((c) => c.trim().startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify Firebase session cookie
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true).catch(() => null);

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // Require admin claim
    if (!decoded.admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Read filters
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status");

    // Firestore query
    let queryRef: FirebaseFirestore.Query = adminDb.collection("partners");

    if (statusFilter) {
      queryRef = queryRef.where("status", "==", statusFilter);
    }

    // Ordering (safe)
    queryRef = queryRef.orderBy("createdAt", "desc");

    const snap = await queryRef.get();

    const partners = snap.docs.map((doc) => ({
      partnerId: doc.id,
      ...doc.data(),
    }));

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
