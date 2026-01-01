// app/api/staff/performance/weekly/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

/**
 * QUERY:
 * ?week=YYYY-WW (optional, default = current week)
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
       2️⃣ WEEK RANGE CALCULATION
    ------------------------------------------------ */
    const { searchParams } = new URL(req.url);
    const weekParam = searchParams.get("week"); // YYYY-WW

    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const currentWeek = Math.ceil(
      (((now.getTime() - firstDayOfYear.getTime()) / 86400000) +
        firstDayOfYear.getDay() +
        1) /
        7
    );

    const year = weekParam
      ? Number(weekParam.split("-")[0])
      : now.getFullYear();
    const week = weekParam
      ? Number(weekParam.split("-")[1])
      : currentWeek;

    const startDate = new Date(year, 0, (week - 1) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const start = startDate.toISOString().slice(0, 10);
    const end = endDate.toISOString().slice(0, 10);

    /* ------------------------------------------------
       3️⃣ FETCH ACTIVITIES
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
       4️⃣ FETCH WEEKLY EARNINGS
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
       5️⃣ PERFORMANCE RATING (SIMPLE LOGIC)
    ------------------------------------------------ */
    const rating =
      conversions >= 10
        ? 5
        : conversions >= 7
        ? 4
        : conversions >= 4
        ? 3
        : conversions >= 1
        ? 2
        : 1;

    return NextResponse.json({
      success: true,
      period: `${year}-W${week}`,
      data: {
        calls,
        followUps,
        conversions,
        totalEarnings,
        rating,
      },
    });
  } catch (error: any) {
    console.error("❌ Weekly performance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
