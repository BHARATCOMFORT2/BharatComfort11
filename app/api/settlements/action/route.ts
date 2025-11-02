import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const { settlementId, action, remarks } = await req.json();

    if (!settlementId || !["approve", "reject"].includes(action))
      throw new Error("Invalid parameters.");

    const ref = adminDb.collection("settlements").doc(settlementId);
    const docSnap = await ref.get();
    if (!docSnap.exists) throw new Error("Settlement not found.");

    const updates: any = {
      status: action === "approve" ? "approved" : "rejected",
      updatedAt: new Date(),
    };
    if (action === "approve") updates.approvedAt = new Date();
    if (action === "reject") updates.rejectedAt = new Date();
    if (remarks) updates.remarks = remarks;

    await ref.update(updates);

    return NextResponse.json({ success: true, message: `Settlement ${action}d.` });
  } catch (err: any) {
    console.error("❌ Settlement action error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
