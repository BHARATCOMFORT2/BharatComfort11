// app/api/admin/risk-scan/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { runFullRiskScan, computePartnerRisk } from "@/lib/ai/riskScorer";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 🔹 GET  →  Fetch recent partner risk scores (last 100)
 * 🔹 POST →  Admin only: run full scan or single-partner scan
 */
export async function GET() {
  try {
    const snap = await db
      .collection("partner_risk_scores")
      .orderBy("computedAt", "desc")
      .limit(100)
      .get();

    const scores = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, scores });
  } catch (err) {
    console.error("GET /risk-scan error:", err);
    return NextResponse.json({ error: "Failed to load risk scores" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // --- Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    if ((decoded as any).role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const partnerId = body.partnerId as string | undefined;

    // --- Run scan
    let results;
    if (partnerId) {
      const single = await computePartnerRisk(partnerId);
      await db.collection("partner_risk_scores").doc(partnerId).set(single);
      results = [single];
    } else {
      results = await runFullRiskScan();
    }

    // --- Optional: notify admin if high/critical risks found
    const severe = results.filter((r) => r.tier === "high" || r.tier === "critical");
    if (severe.length) {
      const html = `
        <h3>⚠️ Risk Scan Completed</h3>
        <p>${severe.length} partners flagged as <b>High</b> or <b>Critical</b> risk.</p>
        <ul>
          ${severe
            .slice(0, 10)
            .map(
              (r) =>
                `<li>${r.partnerId} — Score: ${r.score} (${r.tier.toUpperCase()})</li>`
            )
            .join("")}
        </ul>
      `;
      await sendEmail("admin@bharatcomfort11.com", "⚠️ Partner Risk Scan Results", html);
    }

    return NextResponse.json({
      success: true,
      total: results.length,
      severe: severe.length,
      results,
    });
  } catch (err) {
    console.error("POST /risk-scan error:", err);
    return NextResponse.json({ error: "Risk scan failed" }, { status: 500 });
  }
}
