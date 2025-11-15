// app/api/admin/partners/approve/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import * as admin from "firebase-admin";

// Helper: read Authorization header
function getAuthHeader(req: Request) {
  const auth = (req as any).headers?.get
    ? (req as any).headers.get("authorization")
    : (req as any).headers?.authorization;
  return auth || "";
}

export async function POST(req: Request) {
  const { adminAuth, adminDb } = getFirebaseAdmin();

  try {
    // ------------------------------------------------------------------
    // 1) AUTHENTICATE ADMIN
    // ------------------------------------------------------------------
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
    }

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Malformed Authorization header" }, { status: 401 });
    }

    // Verify ID token
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(match[1], true);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    if (!decoded.admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // ------------------------------------------------------------------
    // 2) REQUEST BODY
    // ------------------------------------------------------------------
    const data = await req.json();
    const partnerId = data.partnerId;

    if (!partnerId) {
      return NextResponse.json({ success: false, error: "partnerId is required" }, { status: 400 });
    }

    const partnerRef = adminDb.collection("partners").doc(partnerId);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json({ success: false, error: "Partner not found" }, { status: 404 });
    }

    const partner = partnerSnap.data();

    // ------------------------------------------------------------------
    // 3) PREVENT DOUBLE APPROVAL
    // ------------------------------------------------------------------
    if (partner.approved === true) {
      return NextResponse.json(
        { success: false, error: "Partner already approved" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // 4) APPROVE PARTNER
    // ------------------------------------------------------------------
    await partnerRef.update({
      approved: true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: decoded.uid,
    });

    // Give partner role in Firebase
    await adminAuth.setCustomUserClaims(partnerId, { partner: true });

    // Add approval log
    await adminDb.collection("partnerApprovals").add({
      partnerId,
      adminId: decoded.uid,
      action: "approve",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ------------------------------------------------------------------
    // 5) REFERRAL REWARD IF EXISTS
    // ------------------------------------------------------------------
    const referralSnap = await adminDb
      .collection("referrals")
      .where("referredUserId", "==", partnerId)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!referralSnap.empty) {
      const referralDoc = referralSnap.docs[0];
      const referral = referralDoc.data();
      const referrerId = referral.referrerId;

      // Credit ₹500 reward
      await adminDb.collection("users").doc(referrerId).set(
        {
          walletBalance: admin.firestore.FieldValue.increment(500),
          totalEarnings: admin.firestore.FieldValue.increment(500),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Add wallet transaction
      await adminDb
        .collection("users")
        .doc(referrerId)
        .collection("wallet")
        .add({
          type: "credit",
          source: "referral_partner",
          amount: 500,
          referredUserId: partnerId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Mark referral as completed
      await referralDoc.ref.set(
        {
          status: "completed",
          rewardAmount: 500,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // ------------------------------------------------------------------
    // 6) OPTIONAL: EMAIL / SMS NOTIFICATIONS (PLACEHOLDER)
    // ------------------------------------------------------------------
    // sendApprovalEmail(partner.email);
    // sendSMS(partner.phone, "Your KYC is approved!");

    return NextResponse.json({
      success: true,
      message: "Partner approved successfully",
    });
  } catch (err: any) {
    console.error("Error approving partner:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
