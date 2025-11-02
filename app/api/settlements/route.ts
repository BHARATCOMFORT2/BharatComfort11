import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";

/**
 * Admin or system endpoint for creating/fetching partner settlements.
 * For now, it's open for demonstration — restrict later via token/auth.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");

    let ref = adminDb.collection("settlements");
    if (partnerId) ref = ref.where("partnerId", "==", partnerId);
    const snap = await ref.orderBy("createdAt", "desc").get();

    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("❌ Settlements fetch error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { partnerId, amount, periodStart, periodEnd, status = "pending" } =
      await req.json();
    if (!partnerId || !amount) throw new Error("Missing required fields.");

    const docRef = adminDb.collection("settlements").doc();
    await docRef.set({
      id: docRef.id,
      partnerId,
      amount,
      status,
      periodStart: periodStart ? new Date(periodStart) : null,
      periodEnd: periodEnd ? new Date(periodEnd) : null,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (err: any) {
    console.error("❌ Settlement create error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
