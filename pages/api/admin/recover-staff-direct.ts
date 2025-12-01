import type { NextApiRequest, NextApiResponse } from "next";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { db: adminDb } = getFirebaseAdmin();

    const staffSnap = await adminDb.collection("staff").get();

    let updated = 0;
    let skipped = 0;

    const batch = adminDb.batch();
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
    }

    if (count > 0) await batch.commit();

    return res.status(200).json({
      success: true,
      message: "✅ STAFF RECOVERY COMPLETED",
      result: { updated, skipped },
    });
  } catch (error: any) {
    console.error("STAFF RECOVERY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Staff recovery failed",
    });
  }
}
