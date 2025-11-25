// app/api/admin/partners/kyc/route.ts

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

// Robust header extractor
function getAuthHeader(req: Request) {
  const anyReq = req as any;
  if (anyReq?.headers?.get) return anyReq.headers.get("authorization");
  return anyReq?.headers?.authorization || anyReq?.headers?.Authorization || null;
}

export async function POST(req: Request) {
  try {
    const { adminDb, adminAuth } = getFirebaseAdmin();

    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json({ error: "Missing Authorization" }, { status: 401 });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Enforce admin claim/role
    const isAdmin = !!decoded.admin || (decoded.role && String(decoded.role).toLowerCase() === "admin");
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const { partnerUid, kycId, action, reason = "" } = body || {};

    if (!partnerUid || !kycId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    // Normalize action -> status
    let newStatus: "APPROVED" | "REJECTED";
    if (String(action).toLowerCase() === "approve" || String(action).toLowerCase() === "approved") {
      newStatus = "APPROVED";
    } else if (String(action).toLowerCase() === "reject" || String(action).toLowerCase() === "rejected") {
      newStatus = "REJECTED";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Prepare update
    const updatePayload: any = {
      status: newStatus,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: decoded.uid,
    };

    if (newStatus === "REJECTED") {
      updatePayload.rejectedReason = reason || "No reason provided";
    }

    // Update KYC doc
    await kycRef.update(updatePayload);

    // Update partner-level status (merge)
    await adminDb.collection("partners").doc(partnerUid).set(
      {
        kycStatus: newStatus,
        kycReviewedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Audit trail
    await adminDb
      .collection("partners")
      .doc(partnerUid)
      .collection("kycAudit")
      .add({
        action: newStatus === "APPROVED" ? "approved" : "rejected",
        reason: reason || null,
        adminUid: decoded.uid,
        kycId,
        createdAt: FieldValue.serverTimestamp(),
      });

    // Optional: create a notification for partner (partner client listens)
    try {
      await adminDb.collection("notifications").add({
        userId: partnerUid,
        type: "kyc",
        title: `KYC ${newStatus}`,
        body:
          newStatus === "APPROVED"
            ? "Your KYC has been approved by the admin."
            : `Your KYC was rejected. Reason: ${reason || "See details in dashboard."}`,
        createdAt: FieldValue.serverTimestamp(),
        read: false,
        meta: { kycId, status: newStatus },
      });
    } catch (notifErr) {
      console.warn("Failed to create notification:", notifErr);
      // non-fatal
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err: any) {
    console.error("Admin KYC review error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
