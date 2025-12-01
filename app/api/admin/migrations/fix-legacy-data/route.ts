export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// ✅ Auth header helper
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    // ✅ ADMIN TOKEN VERIFY
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Missing Authorization" },
        { status: 401 }
      );
    }

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m) {
      return NextResponse.json(
        { success: false, message: "Bad Authorization header" },
        { status: 401 }
      );
    }

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(m[1], true);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid admin token" },
        { status: 401 }
      );
    }

    const adminId = decoded.uid;

    // ✅ VERIFY ADMIN FROM FIRESTORE
    const adminSnap = await adminDb.collection("admins").doc(adminId).get();
    if (!adminSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Admin access denied" },
        { status: 403 }
      );
    }

    const now = new Date();

    /* -----------------------------------
       1️⃣ FIX LEGACY LEADS
    ------------------------------------ */
    const leadsSnap = await adminDb.collection("leads").get();

    let leadsUpdated = 0;
    let leadsSkipped = 0;

    let batch = adminDb.batch();
    let batchCount = 0;

    for (const doc of leadsSnap.docs) {
      const d = doc.data();
      const update: any = {};

      // ✅ phone <- contact (legacy)
      if (!d.phone && d.contact) {
        update.phone = String(d.contact).trim();
      }

      // ✅ category default
      if (!d.category) {
        update.category = "hotel"; // default safe
      }

      // ✅ followupDate default
      if (d.followupDate === undefined) {
        update.followupDate = "";
      }

      // ✅ notes + callLogs arrays
      if (!Array.isArray(d.notes)) {
        update.notes = [];
      }
      if (!Array.isArray(d.callLogs)) {
        update.callLogs = [];
      }

      // ✅ timestamps
      if (!d.createdAt) {
        update.createdAt = now;
      }
      if (!d.updatedAt) {
        update.updatedAt = now;
      }

      // ✅ tracking fields
      if (!d.lastUpdatedBy) {
        update.lastUpdatedBy = adminId;
      }

      if (Object.keys(update).length === 0) {
        leadsSkipped++;
        continue;
      }

      batch.update(doc.ref, update);
      batchCount++;
      leadsUpdated++;

      // Firestore batch limit handle
      if (batchCount >= 400) {
        await batch.commit();
        batch = adminDb.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    /* -----------------------------------
       2️⃣ FIX LEGACY STAFF (TELECALLERS)
    ------------------------------------ */
    const staffSnap = await adminDb.collection("staff").get();

    let staffUpdated = 0;
    let staffSkipped = 0;

    let staffBatch = adminDb.batch();
    let staffBatchCount = 0;

    for (const doc of staffSnap.docs) {
      const d = doc.data();
      const update: any = {};

      // Sirf telecaller ke liye fix
      if (d.role === "telecaller") {
        if (!d.status) {
          update.status = "approved"; // legacy telecallers ko active maan rahe
        }
        if (d.isActive === undefined) {
          update.isActive = true;
        }
      }

      if (Object.keys(update).length === 0) {
        staffSkipped++;
        continue;
      }

      staffBatch.update(doc.ref, update);
      staffBatchCount++;
      staffUpdated++;

      if (staffBatchCount >= 400) {
        await staffBatch.commit();
        staffBatch = adminDb.batch();
        staffBatchCount = 0;
      }
    }

    if (staffBatchCount > 0) {
      await staffBatch.commit();
    }

    return NextResponse.json({
      success: true,
      message: "Legacy data fix completed",
      leads: { updated: leadsUpdated, skipped: leadsSkipped },
      staff: { updated: staffUpdated, skipped: staffSkipped },
    });
  } catch (error: any) {
    console.error("LEGACY DATA FIX ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to fix legacy data",
      },
      { status: 500 }
    );
  }
}
