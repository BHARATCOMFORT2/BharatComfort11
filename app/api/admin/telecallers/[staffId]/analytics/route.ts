import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { staffId: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer "))
      return NextResponse.json({ success: false }, { status: 401 });

    const token = authHeader.split("Bearer ")[1];
    const { auth, db } = getFirebaseAdmin();
    const decoded = await auth.verifyIdToken(token, true);

    // ✅ ADMIN CHECK
    const adminSnap = await db.collection("admins").doc(decoded.uid).get();
    if (!adminSnap.exists)
      return NextResponse.json({ success: false }, { status: 403 });

    const staffId = params.staffId;

    // 📞 CALLS
    const callsSnap = await db
      .collectionGroup("logs")
      .where("calledBy", "==", staffId)
      .get();

    // 📋 LEADS
    const leadsSnap = await db
      .collection("leads")
      .where("assignedTo", "==", staffId)
      .get();

    const statusCount: Record<string, number> = {};
    leadsSnap.docs.forEach((d) => {
      const s = d.data().status || "unknown";
      statusCount[s] = (statusCount[s] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      totalCalls: callsSnap.size,
      totalLeads: leadsSnap.size,
      statusCount,
      lastCallAt:
        callsSnap.docs
          .map((d) => d.data().createdAt?.toDate?.())
          .sort((a, b) => (b?.getTime?.() || 0) - (a?.getTime?.() || 0))[0] ||
        null,
    });
  } catch (e) {
    console.error("Admin analytics error:", e);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
