export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/partners/create/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

type BodyCreatePartner = {
  // client shouldn't send uid (we'll use idToken uid). If provided, we'll validate.
  uid?: string;
  displayName?: string;
  phone?: string | null;
  email?: string | null;
  businessName?: string | null;
  metadata?: Record<string, any>;
};

function getAuthHeader(req: Request | NextRequest) {
  const auth = (req as any).headers?.get ? (req as any).headers.get("authorization") : (req as any).headers?.authorization;
  return auth || "";
}

export async function POST(req: Request) {
  try {
    // ensure JSON body
    const body: BodyCreatePartner = await req.json().catch(() => ({}));

    // 1) get token
    const authHeader = getAuthHeader(req);
    if (!authHeader) return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) return NextResponse.json({ error: "Malformed Authorization header" }, { status: 401 });
    const idToken = match[1];

    // 2) verify token
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch (err) {
      console.error("Token verify failed:", err);
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const uid = decoded.uid;
    // optional: if client sent uid, enforce it's the same
    if (body.uid && body.uid !== uid) {
      return NextResponse.json({ error: "UID mismatch" }, { status: 403 });
    }

    // 3) validate basic payload (you can expand validations)
    const docData: Record<string, any> = {
      displayName: body.displayName || null,
      phone: body.phone || null,
      email: body.email || null,
      businessName: body.businessName || null,
      metadata: body.metadata || null,
      status: "pending", // initial status
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 4) Create/merge partner doc
    const partnerRef = adminDb.collection("partners").doc(uid);
    // If you want to prevent overwriting existing approved partner, check first:
    const snap = await partnerRef.get();
    if (snap.exists) {
      const existing = snap.data();
      // If already approved, block overwrite unless admin
      if (existing?.status === "approved") {
        return NextResponse.json({ error: "Partner already approved; contact support" }, { status: 409 });
      }
      // otherwise merge new fields (do not overwrite status if already set to kyc_pending/rejected)
      await partnerRef.set(
        {
          ...docData,
          // preserve existing status if it already moved beyond pending
          status: existing?.status ? existing.status : "pending",
          // preserve createdAt/createdBy if already existed
          createdAt: existing?.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          createdBy: existing?.createdBy || uid,
        },
        { merge: true }
      );
    } else {
      await partnerRef.set(docData, { merge: true });
    }

    // 5) Return success
    return NextResponse.json({ ok: true, uid, message: "Partner profile created/updated", partnerId: uid });
  } catch (err: any) {
    console.error("Create partner error:", err);
    return NextResponse.json({ error: err?.message || "internal error" }, { status: 500 });
  }
}
