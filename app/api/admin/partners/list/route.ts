// app/api/admin/partners/list/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

// Extract Authorization header
function getAuthHeader(req: Request) {
  const auth = (req as any).headers?.get
    ? (req as any).headers.get("authorization")
    : (req as any).headers?.authorization;
  return auth || "";
}

export async function GET(req: Request) {
  try {
    // 1) Admin Authentication
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match)
      return NextResponse.json(
        { error: "Malformed Authorization header" },
        { status: 401 }
      );

    const idToken = match[1];
    let decoded;

    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // ensure admin role
    if (!decoded.admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // 2) Read filters from URL query
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status"); // optional

    // 3) Query Firestore
    let queryRef = adminDb.collection("partners");

    if (statusFilter) {
      queryRef = queryRef.where("status", "==", statusFilter);
    }

    const snap = await queryRef.orderBy("createdAt", "desc").get();

    const partners = snap.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      ok: true,
      total: partners.length,
      partners,
    });
  } catch (err: any) {
    console.error("Admin partner list error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
