// app/api/admin/partners/reject/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    // 1) Verify admin session cookie
    const cookieHeader = req.headers.get("cookie") || "";

    const sessionCookie =
      cookieHeader
        .split(";")
        .find((c) => c.trim().startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated (no session)" },
        { status: 401 }
      );
    }

    const decodedAdmin = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    ).catch(() => null);

    if (!decodedAdmin) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    if (!decodedAdmin.admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // 2) Parse body
    const body = await req.json().catch(() => ({}));
    const partnerId = body.partnerId;
    const remarks = body.remarks ?? null;

    if (!partnerId) {
      return NextResponse.json(
        { error: "partnerId is required" },
        { status: 400 }
      );
    }

    // 3) Load partner
    const partnerRef = adminDb.collection("partners").doc(partnerId);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const partner = partnerSnap.data() || {};
    const partnerUid = partner.uid;

    if (!partnerUid) {
      return NextResponse.json(
        { error: "Partner record missing uid" },
        { status: 400 }
      );
    }

    // If already rejected
    if (partner.status === "rejected") {
      return NextResponse.json(
        { error: "Partner already rejected" },
        { status: 409 }
      );
    }

    // 4) Update partner "rejected" status
    const now = admin.firestore.FieldValue.serverTimestamp();

    await partnerRef.update({
      status: "rejected",
      rejectedAt: now,
      rejectedBy: decodedAdmin.uid,
      rejectRemarks: remarks,
      kycStatus: "rejected",
      kycVerifiedAt: null,
      updatedAt: now,
    });

    // 5) Remove partner custom claim if exists
    const user = await adminAuth.getUser(partnerUid).catch(() => null);

    if (user) {
      const claims = user.customClaims || {};
      delete claims.partner;
      delete claims.partnerId;

      await adminAuth.setCustomUserClaims(partnerUid, claims);
    }

    // 6) Log the rejection
    await adminDb.collection("partnerApprovals").add({
      partnerId,
      partnerUid,
      adminId: decodedAdmin.uid,
      action: "reject",
      remarks: remarks || null,
      createdAt: now,
    });

    // 7) Done
    return NextResponse.json({
      success: true,
      message: "Partner rejected successfully",
    });
  } catch (err: any) {
    console.error("🔥 Admin partner reject error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
