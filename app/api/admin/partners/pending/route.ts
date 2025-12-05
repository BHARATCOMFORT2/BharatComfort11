// app/api/admin/partners/pending/route.ts
// ✅ Lists all partners with kycStatus = UNDER_REVIEW
// ✅ Reads KYC from partners/{uid}.kyc (NOT subcollection)
// ✅ Admin only
// ✅ Matches your current production KYC structure

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // -----------------------------------
    // 1) Auth: Admin session verification
    // -----------------------------------
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

    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded?.uid) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // ✅ Double-confirm admin from users collection
    const adminUserSnap = await adminDb
      .collection("users")
      .doc(decoded.uid)
      .get();

    const adminUser = adminUserSnap.exists ? adminUserSnap.data() : null;

    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // -----------------------------------
    // 2) Fetch all partners with UNDER_REVIEW KYC
    // -----------------------------------
    const partnersSnap = await adminDb
      .collection("partners")
      .where("kycStatus", "==", "UNDER_REVIEW")
      .orderBy("kycSubmittedAt", "desc")
      .get();

    const pendingList: any[] = [];

    for (const partnerDoc of partnersSnap.docs) {
      const partnerId = partnerDoc.id;
      const partnerData = partnerDoc.data();

      pendingList.push({
        partnerId,
        partner: {
          name: partnerData.name || null,
          email: partnerData.email || null,
          phone: partnerData.phone || null,
          businessName: partnerData.businessName || null,
        },
        kyc: partnerData.kyc || null,
        kycStatus: partnerData.kycStatus || "UNDER_REVIEW",
        submittedAt: partnerData.kycSubmittedAt || null,
      });
    }

    return NextResponse.json({
      success: true,
      total: pendingList.length,
      pending: pendingList,
    });
  } catch (err: any) {
    console.error("🔥 Admin pending KYC error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
