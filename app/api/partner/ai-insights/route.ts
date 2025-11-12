// ✅ Force Node.js runtime (disable static/edge optimization)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { generatePartnerInsights } from "@/lib/ai/partnerCoach";

/**
 * 🔹 GET /api/partner/ai-insights
 * Generates personalized AI insights for a partner (requires Bearer token)
 */
export async function GET(req: Request) {
  try {
    // ✅ Ensure Firebase Admin initializes lazily, not at import
    getFirebaseAdmin();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const insights = await generatePartnerInsights(uid);
    return NextResponse.json({ success: true, insights });
  } catch (err: any) {
    console.error("Partner AI insights error:", err);
    return NextResponse.json(
      { error: "Failed to generate partner AI insights", details: err.message },
      { status: 500 }
    );
  }
}
