// ✅ Prevent static optimization and force Node runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * 🧾 System Logs API
 * Fetches internal admin logs such as wallet adjustments, approvals, settlements, etc.
 * 
 * 🔒 Access: Admin-only (validated upstream in middleware)
 * 📦 Query params:
 *   - type: optional (filter logs by event type)
 *   - limit: optional (max records to fetch, default 50)
 *   - since: optional ISO date filter (fetch logs after specific date)
 */
export async function GET(req: Request) {
  try {
    // ✅ Initialize Firebase Admin lazily (not at import)
    const { db } = getFirebaseAdmin();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const since = searchParams.get("since");

    let queryRef = db.collection("system_logs").orderBy("createdAt", "desc");

    if (type) queryRef = queryRef.where("type", "==", type);
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        queryRef = queryRef.where("createdAt", ">=", sinceDate);
      }
    }

    const logsSnap = await queryRef.limit(limit).get();
    const logs = logsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (err: any) {
    console.error("🔥 System logs fetch failed:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
