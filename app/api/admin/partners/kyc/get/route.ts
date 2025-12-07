export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * ✅ ADMIN: GET SINGLE PARTNER KYC
 *
 * GET /api/admin/partners/kyc/get?partnerUid=XXX&kycId=YYY
 *
 * Auth:
 *  - Firebase __session cookie
 *  - users/{uid}.role === "admin"
 */

/* -----------------------------------
   Extract Session Cookie
----------------------------------- */
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

    /* -----------------------------------
       1️⃣ Admin Authentication (SESSION)
    ----------------------------------- */
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

    // ✅ Enforce admin role from USERS collection
    const adminSnap = await adminDb.collection("users").doc(adminUid).get();

    if (!adminSnap.exists || adminSnap.data()?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    /* -----------------------------------
       2️⃣ Read Query Params
    ----------------------------------- */
    const url = new URL(req.url);
    const partnerUid = url.searchParams.get("partnerUid");
    const kycId = url.searchParams.get("kycId");

    if (!partnerUid) {
      return NextResponse.json(
        { error: "partnerUid is required" },
        { status: 400 }
      );
    }

    /* -----------------------------------
       3️⃣ Fetch Partner Profile
    ----------------------------------- */
    const partnerRef = adminDb.collection("partners").doc(partnerUid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const partnerData = partnerSnap.data() || {};

    /* -----------------------------------
       4️⃣ Fetch KYC Document
    ----------------------------------- */
    let kycDocSnap: FirebaseFirestore.QueryDocumentSnapshot;

    if (kycId) {
      const singleSnap = await partnerRef
        .collection("kycDocs")
        .doc(kycId)
        .get();

      if (!singleSnap.exists) {
        return NextResponse.json(
          { error: "KYC record not found" },
          { status: 404 }
        );
      }

      // 👇 convert to QueryDocumentSnapshot-like
      kycDocSnap = singleSnap as any;
    } else {
      const kycListSnap = await partnerRef
        .collection("kycDocs")
        .orderBy("submittedAt", "desc")
        .limit(1)
        .get();

      if (kycListSnap.empty) {
        return NextResponse.json(
          { error: "No KYC submissions found" },
          { status: 404 }
        );
      }

      kycDocSnap = kycListSnap.docs[0];
    }

    const kycData = kycDocSnap.data() || {};
    const kycStatus = String(
      kycData.status || partnerData.kycStatus || "UNDER_REVIEW"
    ).toUpperCase();

    /* -----------------------------------
       5️⃣ Final Response
    ----------------------------------- */
    return NextResponse.json({
      ok: true,
      partnerUid,
      kycId: kycDocSnap.id,

      partner: {
        name: partnerData.name || null,
        displayName: partnerData.displayName || null,
        businessName: partnerData.businessName || null,
        email: partnerData.email || null,
        phone: partnerData.phone || null,
        status: partnerData.status || null,
        kycStatus: partnerData.kycStatus || null,
      },

      kyc: {
        idType: kycData.idType || null,
        idNumberMasked: kycData.idNumberMasked || null,
        documents: kycData.documents || [],
        submittedAt: kycData.submittedAt || null,
        status: kycStatus,
        rejectedReason: kycData.rejectedReason || null,
        reviewedAt: kycData.reviewedAt || null,
      },
    });
  } catch (err: any) {
    console.error("Admin KYC GET Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
