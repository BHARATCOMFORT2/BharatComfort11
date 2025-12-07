export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * ✅ ADMIN KYC LIST API (SECURE)
 *
 * GET /api/admin/partners/kyc/list?status=UNDER_REVIEW | APPROVED | REJECTED
 *
 * Auth:
 *  - Firebase __session cookie
 *  - users/{uid}.role === "admin"
 */

// -----------------------------------
// Extract Session Cookie
// -----------------------------------
function getSessionCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  return (
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("__session="))
      ?.split("=")[1] || ""
  );
}

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // -----------------------------------
    // 1️⃣ Admin Authentication via session
    // -----------------------------------
    const sessionCookie = getSessionCookie(req);

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const adminUid = decoded.uid;

    // ✅ Enforce admin role from users collection
    const adminSnap = await adminDb.collection("users").doc(adminUid).get();

    if (!adminSnap.exists || adminSnap.data()?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // -----------------------------------
    // 2️⃣ Optional status filter
    // -----------------------------------
    const url = new URL(req.url);
    const statusFilterRaw = url.searchParams.get("status");
    const statusFilter = statusFilterRaw
      ? statusFilterRaw.toUpperCase()
      : null;

    // -----------------------------------
    // 3️⃣ Fetch only partners with KYC
    // -----------------------------------
    const partnersSnap = await adminDb.collection("partners").get();

    const results: any[] = [];

    for (const partnerDoc of partnersSnap.docs) {
      const partnerUid = partnerDoc.id;
      const partnerData = partnerDoc.data() || {};

      const kycDocsSnap = await adminDb
        .collection("partners")
        .doc(partnerUid)
        .collection("kycDocs")
        .orderBy("submittedAt", "desc")
        .limit(5) // ✅ safety limit
        .get();

      if (kycDocsSnap.empty) continue;

      for (const doc of kycDocsSnap.docs) {
        const kyc = doc.data() || {};
        const kycStatus = String(kyc.status || "UNDER_REVIEW").toUpperCase();

        // ✅ Apply filter if provided
        if (statusFilter && kycStatus !== statusFilter) continue;

        results.push({
          partnerUid,

          partner: {
            name: partnerData.name || null,
            displayName: partnerData.displayName || null,
            businessName: partnerData.businessName || null,
            email: partnerData.email || null,
            phone: partnerData.phone || null,
            status: partnerData.status || null,
            kycStatus: partnerData.kycStatus || null,
          },

          kycId: doc.id,
          kycType: kyc.idType || null,
          status: kycStatus,
          submittedAt: kyc.submittedAt || null,
          documents: kyc.documents || [],
        });
      }
    }

    return NextResponse.json({
      ok: true,
      total: results.length,
      data: results,
    });
  } catch (err: any) {
    console.error("Admin KYC List Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
