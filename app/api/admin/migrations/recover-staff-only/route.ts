export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    // ✅ TOKEN VERIFY
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Missing Authorization" },
        { status: 401 }
      );
    }

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json(
        { success: false, message: "Bad Authorization" },
        { status: 401 }
      );
    }

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(match[1], true);
    const adminId = decoded.uid;

    // ✅ VERIFY ADMIN FROM FIRESTORE
    const adminSnap = await adminDb.collection("admins").doc(adminId).get();
    if (!adminSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Admin access denied" },
        { status: 403 }
      );
    }

    // ✅ FIX ONLY STAFF DATA
    const staffSnap = await adminDb.collection("staff").get();

    let updated = 0;
    let skipped = 0;

    let batch = adminDb.batch();
    let count = 0;

    for (const doc of staffSnap.docs) {
      const d = doc.data();
      const update: any = {};

      // ✅ Sirf TELECALLER ko recover karo
      if (d.role === "telecaller") {
        if (!d.status) update.status = "approved";
        if (d.isActive === undefined) update.isActive = true;
        if (!d.updatedAt) update.updatedAt = new Date();
      }

      if (Object.keys(update).length === 0) {
        skipped++;
        continue;
      }

      batch.update(doc.ref, update);
      updated++;
      count++;

      if (count >= 400) {
        await batch.commit();
        batch = adminDb.batch();
        count = 0;
      }
    }

    if (count > 0) await batch.commit();

    return NextResponse.json({
      success: true,
      message: "Staff recovery completed",
      result: { updated, skipped },
    });
  } catch (error: any) {
    console.error("STAFF RECOVERY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to recover staff",
      },
      { status: 500 }
    );
  }
}
