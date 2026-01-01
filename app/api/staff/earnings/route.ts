// app/api/staff/earnings/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

/**
 * QUERY PARAMS:
 * ?range=today | week | month
 */
export async function GET(req: Request) {
  try {
    /* ------------------------------------------------
       1️⃣ STAFF AUTH VERIFY
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
    const staffId = decoded.uid;

    /* ------------------------------------------------
       2️⃣ STAFF CHECK
    ------------------------------------------------ */
    const staffSnap = await adminDb.collection("staff").doc(staffId).get();
    if (!staffSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Staff access only" },
        { status: 403 }
      );
    }

    /* ------------------------------------------------
       3️⃣ DATE RANGE CALCULATION
    ------------------------------------------------ */
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "today";

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (range === "week") {
      const day = now.getDay() || 7;
      startDate.setDate(now.getDate() - day + 1);
    } else if (range === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    /* ------------------------------------------------
       4️⃣ FETCH EARNINGS
    ------------------------------------------------ */
    const snap = await adminDb
      .collection("staffEarnings")
      .where("staffId", "==", staffId)
      .where("date", ">=", startDate.toISOString().slice(0, 10))
      .where("date", "<=", endDate.toISOString().slice(0, 10))
      .orderBy("date", "desc")
      .get();

    let total = 0;
    const earnings: any[] = [];

    snap.forEach((doc) => {
      const d = doc.data();
      total += Number(d.totalEarning || 0);
      earnings.push({
        id: doc.id,
        date: d.date,
        baseAmount: d.baseAmount,
        bonus: d.bonus,
        penalty: d.penalty,
        totalEarning: d.totalEarning,
        remarks: d.remarks || "",
      });
    });

    return NextResponse.json({
      success: true,
      range,
      totalEarning: total,
      records: earnings,
    });
  } catch (error: any) {
    console.error("❌ Staff earnings fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
