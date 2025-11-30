// app/api/admin/leads/assign-bulk/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseadmin";

/* ✅ Token Verify Helper */
async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split("Bearer ")[1];
  const decoded = await adminAuth.verifyIdToken(token);

  if (!["admin", "superadmin"].includes(decoded.role)) {
    throw new Error("Permission denied");
  }

  return decoded;
}

/* ✅ BULK ASSIGN API */
export async function POST(req: Request) {
  try {
    await verifyAdmin(req);

    const body = await req.json();
    const { leadIds, staffId } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0 || !staffId) {
      return NextResponse.json(
        { success: false, message: "Invalid payload" },
        { status: 400 }
      );
    }

    const batch = adminDb.batch();

    leadIds.forEach((leadId: string) => {
      const ref = adminDb.collection("leads").doc(leadId);

      batch.update(ref, {
        assignedTo: staffId,
        status: "assigned",
        updatedAt: new Date(),
      });
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "Bulk assignment completed",
      total: leadIds.length,
    });
  } catch (err: any) {
    console.error("Bulk Assign Error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Bulk assign failed",
      },
      { status: 500 }
    );
  }
}
