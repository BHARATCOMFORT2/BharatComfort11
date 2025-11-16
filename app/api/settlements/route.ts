export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

/**
 * GET /api/settlements
 * - Admin: lists all settlements
 * - Partner: lists settlements belonging to logged-in partner
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;
    const role = (decoded as any).role || "partner";

    const q =
      role === "admin"
        ? db.collection("settlements").orderBy("createdAt", "desc")
        : db
            .collection("settlements")
            .where("partnerId", "==", uid)
            .orderBy("createdAt", "desc");

    const snap = await q.get();
    const settlements = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ success: true, settlements });
  } catch (error) {
    console.error("Error fetching settlements:", error);
    return NextResponse.json(
      { error: "Failed to fetch settlements" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settlements
 * - Allows admin to create manual settlement
 * - Body: { partnerId, amount, remark?, status? }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role || "partner";

    if (role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admin can create settlements manually" },
        { status: 403 }
      );
    }

    const { partnerId, amount, remark = "", status = "approved" } =
      await req.json();

    if (!partnerId || !amount)
      return NextResponse.json(
        { error: "partnerId and amount are required" },
        { status: 400 }
      );

    const newDocRef = db.collection("settlements").doc();
    await newDocRef.set({
      id: newDocRef.id,
      partnerId,
      amount: Number(amount),
      status,
      remark,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.collection("system_logs").add({
      type: "manual_settlement_created",
      partnerId,
      amount: Number(amount),
      status,
      remark,
      adminId: decoded.uid,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      settlementId: newDocRef.id,
    });
  } catch (error: any) {
    console.error("Error creating settlement:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create settlement" },
      { status: 500 }
    );
  }
}
