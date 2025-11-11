// app/api/admin/finance-audit/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { runFinanceAudit, saveAnomalies, FinanceAuditConfig } from "@/lib/ai/financeAuditor";
import { sendEmail } from "@/lib/email";
import { sendSlackAlert } from "@/lib/notify-slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  -> Return latest anomalies (most recent 100).
 * POST -> Run audit now (admin only), persist anomalies, optionally notify.
 */
export async function GET() {
  try {
    const snap = await db
      .collection("finance_anomalies")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const anomalies = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, anomalies });
  } catch (err) {
    console.error("Finance audit GET error:", err);
    return NextResponse.json({ error: "Failed to load anomalies" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // ---- AuthZ: Admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    if ((decoded as any).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Optional runtime config overrides
    let cfg: FinanceAuditConfig | undefined;
    try {
      const body = await req.json().catch(() => null);
      if (body?.config && typeof body.config === "object") cfg = body.config as FinanceAuditConfig;
    } catch {
      /* ignore bad json */
    }

    // ---- Run audit
    const { anomalies, summary } = await runFinanceAudit(cfg);

    // ---- Persist anomalies (idempotent by anomaly.id)
    if (anomalies.length) {
      await saveAnomalies(anomalies);
    }

    // ---- Load notification settings
    const settingsSnap = await db.doc("admin_settings/notifications").get();
    const settings = settingsSnap.exists ? (settingsSnap.data() as any) : {};

    // ---- Notify (Slack + Email) for high/critical only
    const severe = anomalies.filter((a) => a.severity === "high" || a.severity === "critical");

    if (severe.length) {
      // Slack
      if (settings.slackAlerts && settings.slackWebhook) {
        const lines = severe
          .slice(0, 10)
          .map(
            (a) =>
              `• *${a.type}* (${a.severity.toUpperCase()}) — ${a.message}${
                a.partnerId ? ` [partner:${a.partnerId}]` : ""
              }`
          )
          .join("\n");

        const slackText = `🚨 *Finance Anomalies Detected*\n${lines}\n\nSummary: ${JSON.stringify(
          summary
        )}`;
        await sendSlackAlert(settings.slackWebhook, slackText);
      }

      // Email
      if (settings.emailAlerts && Array.isArray(settings.alertRecipients) && settings.alertRecipients.length) {
        const html = `
          <h3>🚨 Finance Anomalies Detected</h3>
          <ul>
            ${severe
              .slice(0, 10)
              .map(
                (a) =>
                  `<li><b>${a.type}</b> (${a.severity}) — ${a.message}${
                    a.partnerId ? ` [partner:${a.partnerId}]` : ""
                  }</li>`
              )
              .join("")}
          </ul>
          <p><b>Summary:</b> ${Object.entries(summary)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")}</p>
          <p>Open Admin → Finance → Anomalies to review & resolve.</p>
        `;
        await Promise.all(
          settings.alertRecipients.map((to: string) =>
            sendEmail(to, "🚨 Finance Anomalies Detected", html)
          )
        );
      }
    }

    return NextResponse.json({
      success: true,
      saved: anomalies.length,
      summary,
      notified: severe.length,
    });
  } catch (err) {
    console.error("Finance audit POST error:", err);
    return NextResponse.json({ error: "Audit failed" }, { status: 500 });
  }
}
