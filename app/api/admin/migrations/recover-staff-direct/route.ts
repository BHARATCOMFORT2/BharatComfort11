export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET() {
  try {
    const { db: adminDb } = getFirebaseAdmin();

    const staffSnap = await adminDb.collection("staff").get();

    let updated = 0;
    let skipped = 0;

    let batch = adminDb.batch();
    let count = 0;

    for (const doc of staffSnap.docs) {
      const d = doc.data();
      const update: any = {};

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
      message: "STAFF RECOVERY DONE (NO AUTH MODE)",
      result: { updated, skipped },
    });
  } catch (error: any) {
    console.error("STAFF RECOVERY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Staff recovery failed",
      },
      { status: 500 }
    );
  }
}
