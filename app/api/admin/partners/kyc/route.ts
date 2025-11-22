// app/api/admin/partners/kyc/route.ts

// ✅ Only one runtime declaration
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// Extract Authorization header reliably for Node.js runtimes
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? (req as any).headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    // ✅ Stable Firebase Admin instance
    const { adminDb, adminAuth } = getFirebaseAdmin();

    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing Authorization" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await adminAuth.verifyIdToken(token);

    // Optional: enforce only admin users can approve/reject KYC
    // if (decoded.role !== "admin") {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await req.json();
    const { partnerUid, kycId, action, reason } = body;

    if (!partnerUid || !kycId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const kycRef = adminDb
      .collection("partners")
      .doc(partnerUid)
      .collection("kycDocs")
      .doc(kycId);

    const kycSnap = await kycRef.get();
    if (!kycSnap.exists) {
      return NextResponse.json({ error: "KYC not found" }, { status: 404 });
    }

    // Prepare updates
    const update: any = {
      reviewedAt: new Date(),
      reviewedBy: decoded.uid,
    };

    if (action === "approve") {
      update.status = "approved";
    } else if (action === "reject") {
      update.status = "rejected";
      update.rejectedReason = reason || "No reason provided";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update KYC doc
    await kycRef.update(update);

    // Update partner-level status
    await adminDb.collection("partners").doc(partnerUid).set(
      {
        kycStatus: update.status,
        kycReviewedAt: new Date(),
      },
      { merge: true }
    );

    // Add audit trail
    await adminDb
      .collection("partners")
      .doc(partnerUid)
      .collection("kycAudit")
      .add({
        action,
        reason: reason || null,
        adminUid: decoded.uid,
        kycId,
        createdAt: new Date(),
      });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Admin KYC review error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
