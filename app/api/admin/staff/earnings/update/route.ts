// app/api/admin/staff/earnings/update/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * BODY:
 * {
 *   staffId: string,
 *   date: "YYYY-MM-DD",
 *   baseAmount: number,
 *   bonus?: number,
 *   penalty?: number,
 *   remarks?: string
 * }
 */
export async function POST(req: Request) {
  try {
    /* ------------------------------------------------
       1️⃣ ADMIN AUTH VERIFY
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
    const adminUid = decoded.uid;

    // ✅ Admin check
    const adminSnap = await adminDb.collection("admins").doc(adminUid).get();
    if (!adminSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    /* ------------------------------------------------
       2️⃣ BODY VALIDATION
    ------------------------------------------------ */
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      staffId,
      date,
      baseAmount,
      bonus = 0,
      penalty = 0,
      remarks = "",
    } = body;

    if (!staffId || !date || baseAmount === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* ------------------------------------------------
       3️⃣ STAFF EXISTENCE CHECK
    ------------------------------------------------ */
    const staffSnap = await adminDb.collection("staff").doc(staffId).get();
    if (!staffSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Staff not found" },
        { status: 404 }
      );
    }

    /* ------------------------------------------------
       4️⃣ UPSERT STAFF EARNING
    ------------------------------------------------ */
    const docId = `${staffId}_${date}`;
    const totalEarning = Number(baseAmount) + Number(bonus) - Number(penalty);

    await adminDb.collection("staffEarnings").doc(docId).set(
      {
        staffId,
        date,
        baseAmount: Number(baseAmount),
        bonus: Number(bonus),
        penalty: Number(penalty),
        totalEarning,
        remarks,
        updatedBy: adminUid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: "Staff earning updated",
      data: {
        staffId,
        date,
        totalEarning,
      },
    });
  } catch (error: any) {
    console.error("❌ Staff earning update error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
