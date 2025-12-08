export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    /* ───────────── AUTH (OPTIONAL BUT SAFE) ───────────── */
    const authHeader = req.headers.get("authorization");

    let uid: string | null = null;
    let role: "partner" | "user" | "admin" | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();

      try {
        const decoded: any = await adminAuth.verifyIdToken(token, true);
        uid = decoded.uid;
        role =
          decoded.role ||
          decoded.customClaims?.role ||
          decoded.customClaims?.userType ||
          null;
      } catch {
        uid = null;
        role = null;
      }
    }

    /* ───────────── PAGINATION ───────────── */
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 50);
    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const offset = (page - 1) * limit;

    const baseRef = adminDb.collection("listings");

    let snap;

    /* ─────────────────────────────────────
       ✅ ✅ ✅ FINAL HARD ENFORCED ROLE LOGIC
    ───────────────────────────────────── */

    // ✅ ✅ ✅ PARTNER → ONLY OWN + NOT DELETED
    if (uid && role === "partner") {
      snap = await baseRef
        .where("partnerId", "==", uid)
        .where("status", "==", "active") // ✅ deleted never leaks
        .orderBy("createdAt", "desc")
        .offset(offset)
        .limit(limit)
        .get();
    }

    // ✅ ✅ ✅ ADMIN → ALL (INCLUDING DELETED)
    else if (uid && role === "admin") {
      snap = await baseRef
        .orderBy("createdAt", "desc")
        .offset(offset)
        .limit(limit)
        .get();
    }

    // ✅ ✅ ✅ USER / GUEST → ONLY ACTIVE PUBLIC
    else {
      snap = await baseRef
        .where("status", "==", "active")
        .orderBy("createdAt", "desc")
        .offset(offset)
        .limit(limit)
        .get();
    }

    const listings = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() || {}),
    }));

    return NextResponse.json({
      ok: true,
      role: role || "guest",
      page,
      limit,
      total: listings.length,
      listings,
    });
  } catch (err: any) {
    console.error("❌ unified listings error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
