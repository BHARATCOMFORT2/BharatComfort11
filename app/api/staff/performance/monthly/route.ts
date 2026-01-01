// app/api/staff/performance/monthly/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

/**
 * QUERY:
 * ?month=YYYY-MM (optional, default = current month)
 */
export async function GET(req: Request) {
  try {
    /* ------------------------------------------------
       1️⃣ AUTH VERIFY (STAFF OR ADMIN)
    ------------------------------------------------ */
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Missing Authorization" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await adminAuth.verifyIdToken(token, true);
    const uid = decoded.uid;

    const adminSnap = await adminDb.collection("admins").doc(uid).get();
    const staffSnap = await adminDb.collection("staff").doc(uid).get();

    if (!adminSnap.exists && !staffSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 403 }
      );
    }

    const staffId = staffSnap.exists ? uid : null;

    /* ------------------------------------------------
       2️⃣ MONTH RANGE CALCULATION
    ------------------------------------------------ */
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month"); // YYYY-MM

    const now = new Date();
    const year = monthParam
      ? Number(monthParam.split("-")[0])
      : now.getFullYear();
    const monthIndex = monthParam
      ? Number(monthParam.split("-")[1]) - 1
      : now.getMonth();

    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0);

    const start = startDate.toISOString().slice(0, 10);
    const end = endDate.toISOString().slice(0, 10);

    /* ------------------------------------------------
       3️⃣ FETCH LEAD ACTIVITIES
    ------------------------------------------------ */
    let activityQuery = adminDb
      .collection("leadActivities")
      .where("createdAt", ">=", start)
      .where("createdAt", "<=", end);

    if (staffId) {
      activityQuery = activityQuery.where("staffId", "==", staffId);
    }

    const activitySnap = await activityQuery.get();

    let calls = 0;
    let followUps = 0;
    let conversions = 0;

    activitySnap.forEach((doc) => {
      const d = doc.data();
      if (d.type === "call") calls++;
      if (d.type === "followup") followUps++;
      if (d.outcome === "converted") conversions++;
    });

    /* ------------------------------------------------
       4️⃣ FETCH MONTHLY EARNINGS
    ------------------------------------------------ */
    let earningQuery = adminDb
      .collection("staffEarnings")
      .where("date", ">=", start)
      .where("date", "<=", end);

    if (staffId) {
      earningQuery = earningQuery.where("staffId", "==", staffId);
    }

    const earningSnap = await earningQuery.get();

    let totalEarnings = 0;
    earningSnap.forEach((doc) => {
      totalEarnings += Number(doc.data().totalEarning || 0);
    });

    /* ------------------------------------------------
       5️⃣ PERFORMANCE RATING (MONTHLY SCALE)
    ------------------------------------------------ */
    const rating =
      conversions >= 40
        ? 5
        : conversions >= 25
        ? 4
        : conversions >= 15
        ? 3
        : conversions >= 5
        ? 2
        : 1;

    return NextResponse.json({
      success: true,
      period: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      data: {
        calls,
        followUps,
        conversions,
        totalEarnings,
        rating,
      },
    });
  } catch (error: any) {
    console.error("❌ Monthly performance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
