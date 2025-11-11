// lib/ai/financeAuditor.ts
import { db, admin } from "@/lib/firebaseadmin";

export type Severity = "low" | "medium" | "high" | "critical";

export type Anomaly = {
  id: string;
  type:
    | "DELAYED_SETTLEMENTS"
    | "HIGH_REFUND_RATIO"
    | "BOOKING_SPIKE"
    | "PAYMENT_FAILURE_SPIKE"
    | "NEGATIVE_MARGIN"
    | "DUPLICATE_KYC"
    | "MISSING_BANK_DETAILS"
    | "STALE_KYC"
    | "UNUSUAL_AVG_TICKET"
    | "WEBHOOK_GAP";
  severity: Severity;
  message: string;
  meta?: Record<string, any>;
  partnerId?: string;
  createdAt: Date;
};

export type FinanceAuditConfig = {
  delayedSettlementDays?: number;      // default 7
  highRefundRatio?: number;            // default 0.25 (25%)
  paymentFailSpikeFactor?: number;     // default 2.0x vs 7-day avg
  bookingSpikeFactor?: number;         // default 2.5x vs 7-day avg
  negativeMarginLookbackDays?: number; // default 14
  staleKYCDays?: number;               // default 180
  unusualTicketZScore?: number;        // default 2.5
};

const DEFAULTS: Required<FinanceAuditConfig> = {
  delayedSettlementDays: 7,
  highRefundRatio: 0.25,
  paymentFailSpikeFactor: 2.0,
  bookingSpikeFactor: 2.5,
  negativeMarginLookbackDays: 14,
  staleKYCDays: 180,
  unusualTicketZScore: 2.5,
};

function sev(level: Severity): Severity { return level; }
function nowMinusDays(n: number) { return new Date(Date.now() - n * 86400000); }

async function fetchMapById(coll: string) {
  const snap = await db.collection(coll).get();
  const out: Record<string, any> = {};
  snap.forEach((d) => (out[d.id] = { id: d.id, ...d.data() }));
  return out;
}

async function fetchRecent(
  coll: string,
  field: string,
  from: Date,
  whereEqual?: [string, any]
) {
  let q: FirebaseFirestore.Query = db
    .collection(coll)
    .where(field, ">=", from)
    .orderBy(field, "desc");

  if (whereEqual) q = q.where(whereEqual[0], "==", whereEqual[1]);

  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Compute mean and std dev
 */
function meanStd(nums: number[]) {
  if (!nums.length) return { mean: 0, std: 0 };
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Core audit that scans Firestore and returns a list of anomalies.
 * Note: does not write anything; caller can persist if needed.
 */
export async function runFinanceAudit(
  cfg: FinanceAuditConfig = {}
): Promise<{ anomalies: Anomaly[]; summary: Record<string, any> }> {
  const c = { ...DEFAULTS, ...cfg };
  const anomalies: Anomaly[] = [];
  const createdAt = new Date();

  // Fetch core datasets in parallel
  const [
    partnersMap,
    recentBookings14,
    recentBookings7,
    refunds30,
    settlements30,
    payments30,
    webhooks30,
  ] = await Promise.all([
    fetchMapById("partners"),
    fetchRecent("bookings", "createdAt", nowMinusDays(14)),
    fetchRecent("bookings", "createdAt", nowMinusDays(7)),
    fetchRecent("refunds", "createdAt", nowMinusDays(30)),
    fetchRecent("settlements", "createdAt", nowMinusDays(30)),
    fetchRecent("payments", "createdAt", nowMinusDays(30)),
    fetchRecent("webhook_events", "createdAt", nowMinusDays(30)),
  ]);

  // Index helpers
  const bookingsByPartner14: Record<string, any[]> = {};
  for (const b of recentBookings14) {
    const pid = b.partnerId || "unknown";
    (bookingsByPartner14[pid] ||= []).push(b);
  }

  // 1) Delayed settlements
  const cutoff = nowMinusDays(c.delayedSettlementDays);
  for (const s of settlements30) {
    if ((s.status === "approved" || s.status === "pending") && s.createdAt?.toDate?.() instanceof Date) {
      const created = s.createdAt.toDate();
      if (created < cutoff) {
        anomalies.push({
          id: `delayed_${s.id}`,
          type: "DELAYED_SETTLEMENTS",
          severity: sev("high"),
          message: `Settlement ${s.id} for partner ${s.partnerId} pending > ${c.delayedSettlementDays} days.`,
          partnerId: s.partnerId,
          meta: { createdAt: created, amount: s.amount, status: s.status },
          createdAt,
        });
      }
    }
  }

  // 2) High refund ratio by partner (30d)
  const refundsByPartner: Record<string, any[]> = {};
  const paidBookings30 = recentBookings14.concat(
    await fetchRecent("bookings", "createdAt", nowMinusDays(30))
  );
  for (const r of refunds30) {
    const pid = r.partnerId || "unknown";
    (refundsByPartner[pid] ||= []).push(r);
  }
  const bookingsByPartner30: Record<string, any[]> = {};
  for (const b of paidBookings30) {
    const pid = b.partnerId || "unknown";
    (bookingsByPartner30[pid] ||= []).push(b);
  }
  for (const pid of Object.keys(bookingsByPartner30)) {
    const total = bookingsByPartner30[pid].length;
    if (!total) continue;
    const refunds = (refundsByPartner[pid] || []).length;
    const ratio = refunds / total;
    if (ratio >= c.highRefundRatio) {
      anomalies.push({
        id: `refundratio_${pid}`,
        type: "HIGH_REFUND_RATIO",
        severity: ratio >= 0.4 ? "critical" : "high",
        message: `Partner ${pid} refund ratio ${(ratio * 100).toFixed(1)}% in last 30 days.`,
        partnerId: pid,
        meta: { refunds, bookings: total, ratio },
        createdAt,
      });
    }
  }

  // 3) Booking spike vs 7d average (per partner)
  const byPartner7: Record<string, number> = {};
  const byPartnerToday: Record<string, number> = {};
  const today = new Date(); today.setHours(0,0,0,0);

  for (const b of recentBookings7) {
    const pid = b.partnerId || "unknown";
    byPartner7[pid] = (byPartner7[pid] || 0) + 1;
    const d = b.createdAt?.toDate?.() as Date | undefined;
    if (d && d >= today) byPartnerToday[pid] = (byPartnerToday[pid] || 0) + 1;
  }
  for (const pid of Object.keys(byPartnerToday)) {
    const todayCount = byPartnerToday[pid];
    const avg7 = (byPartner7[pid] || 0) / 7;
    if (avg7 > 0 && todayCount >= c.bookingSpikeFactor * avg7) {
      anomalies.push({
        id: `bookingspike_${pid}`,
        type: "BOOKING_SPIKE",
        severity: sev("medium"),
        message: `Partner ${pid} bookings spiked today (${todayCount}) vs 7d avg (${avg7.toFixed(1)}).`,
        partnerId: pid,
        meta: { todayCount, avg7, factor: (todayCount / avg7).toFixed(2) },
        createdAt,
      });
    }
  }

  // 4) Payment failure spike (platform-level)
  const failures = payments30.filter((p) => p.status === "failed");
  // Build daily counts for last 14 days
  const dailyFail: Record<string, number> = {};
  for (const f of failures) {
    const d = f.createdAt?.toDate?.() as Date | undefined;
    if (!d) continue;
    const key = d.toISOString().slice(0,10);
    dailyFail[key] = (dailyFail[key] || 0) + 1;
  }
  const counts = Object.entries(dailyFail)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
  if (counts.length >= 7) {
    const last = counts[counts.length - 1];
    const avg7 = counts.slice(-7, -1).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(6, counts.length - 1));
    if (avg7 > 0 && last >= c.paymentFailSpikeFactor * avg7) {
      anomalies.push({
        id: `payfailspike_${Date.now()}`,
        type: "PAYMENT_FAILURE_SPIKE",
        severity: sev("high"),
        message: `Payment failures spiked today (${last}) vs recent avg (${avg7.toFixed(1)}).`,
        meta: { today: last, avg7, factor: (last / avg7).toFixed(2) },
        createdAt,
      });
    }
  }

  // 5) Negative margin partners (commission 10% - refunds over lookback)
  const lookbackStart = nowMinusDays(c.negativeMarginLookbackDays);
  const bookingsLookback = await fetchRecent("bookings", "createdAt", lookbackStart);
  const refundsLookback = await fetchRecent("refunds", "createdAt", lookbackStart);
  const grossByPartner: Record<string, number> = {};
  const refundByPartner: Record<string, number> = {};
  for (const b of bookingsLookback) {
    const pid = b.partnerId || "unknown";
    grossByPartner[pid] = (grossByPartner[pid] || 0) + (Number(b.amount) || 0);
  }
  for (const r of refundsLookback) {
    const pid = r.partnerId || "unknown";
    refundByPartner[pid] = (refundByPartner[pid] || 0) + (Number(r.amount) || 0);
  }
  for (const pid of Object.keys(grossByPartner)) {
    const gross = grossByPartner[pid] || 0;
    const commission = 0.10 * gross;
    const refund = refundByPartner[pid] || 0;
    const margin = commission - refund;
    if (margin < 0 && Math.abs(margin) >= 1000) {
      anomalies.push({
        id: `negmargin_${pid}`,
        type: "NEGATIVE_MARGIN",
        severity: sev("high"),
        message: `Partner ${pid} negative margin in ${c.negativeMarginLookbackDays}d: ₹${Math.round(margin)}`,
        partnerId: pid,
        meta: { gross, commission, refund, margin },
        createdAt,
      });
    }
  }

  // 6) Duplicate KYC (PAN/Aadhaar/IFSC accountNumber)
  // (Simple heuristic: if same PAN appears for >1 uid)
  const kycIndex: Record<string, string[]> = {};
  for (const pid of Object.keys(partnersMap)) {
    const p = partnersMap[pid];
    const keyCandidates = [
      p.kyc?.pan?.toUpperCase?.(),
      p.kyc?.aadhaar?.toString?.(),
      p.bank?.accountNumber?.toString?.(),
    ].filter(Boolean);
    for (const k of keyCandidates) {
      const key = `${k}`;
      (kycIndex[key] ||= []).push(pid);
    }
  }
  for (const k of Object.keys(kycIndex)) {
    const arr = kycIndex[k];
    if (arr.length > 1) {
      anomalies.push({
        id: `dupkyc_${k}`,
        type: "DUPLICATE_KYC",
        severity: sev("critical"),
        message: `Duplicate KYC/bank identifier detected across partners: ${arr.join(", ")}`,
        meta: { key: k, partners: arr },
        createdAt,
      });
    }
  }

  // 7) Missing bank details
  for (const pid of Object.keys(partnersMap)) {
    const p = partnersMap[pid];
    if (!p.bank?.accountNumber || !p.bank?.ifsc) {
      anomalies.push({
        id: `bankmissing_${pid}`,
        type: "MISSING_BANK_DETAILS",
        severity: sev("medium"),
        message: `Partner ${pid} missing bank details (account/IFSC).`,
        partnerId: pid,
        createdAt,
      });
    }
  }

  // 8) Stale KYC (older than threshold or pending too long)
  for (const pid of Object.keys(partnersMap)) {
    const p = partnersMap[pid];
    const updated = p.kyc?.updatedAt?.toDate?.() as Date | undefined;
    const status = p.kyc?.status || "pending";
    if (status !== "approved") continue;
    if (updated && updated < nowMinusDays(c.staleKYCDays)) {
      anomalies.push({
        id: `stalekyc_${pid}`,
        type: "STALE_KYC",
        severity: sev("low"),
        message: `Partner ${pid} KYC older than ${c.staleKYCDays} days.`,
        partnerId: pid,
        meta: { lastUpdated: updated, status },
        createdAt,
      });
    }
  }

  // 9) Unusual average ticket size (z-score)
  const ticketValues = bookingsLookback.map((b) => Number(b.amount) || 0).filter((n) => n > 0);
  const { mean, std } = meanStd(ticketValues);
  if (std > 0) {
    for (const pid of Object.keys(bookingsByPartner14)) {
      const amounts = bookingsByPartner14[pid]
        .map((b) => Number(b.amount) || 0)
        .filter((n) => n > 0);
      if (!amounts.length) continue;
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const z = (avg - mean) / std;
      if (Math.abs(z) >= c.unusualTicketZScore) {
        anomalies.push({
          id: `ticket_${pid}`,
          type: "UNUSUAL_AVG_TICKET",
          severity: sev("medium"),
          message: `Partner ${pid} unusual avg ticket (z=${z.toFixed(2)}).`,
          partnerId: pid,
          meta: { partnerAvg: Math.round(avg), populationMean: Math.round(mean), std: Math.round(std) },
          createdAt,
        });
      }
    }
  }

  // 10) Webhook gap (no webhooks received > 24h)
  if (webhooks30.length) {
    const last = webhooks30
      .map((w) => (w.createdAt?.toDate?.() as Date) || null)
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0]!;
    if (Date.now() - last.getTime() > 24 * 60 * 60 * 1000) {
      anomalies.push({
        id: `webhookgap_${Date.now()}`,
        type: "WEBHOOK_GAP",
        severity: sev("high"),
        message: `No payment webhooks received in last 24h.`,
        meta: { lastReceivedAt: last },
        createdAt,
      });
    }
  }

  // Build summary
  const summary = anomalies.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {});

  return { anomalies, summary };
}

/**
 * Persist anomalies into Firestore collection `finance_anomalies`
 * and return the saved refs (idempotency by composite key).
 */
export async function saveAnomalies(anoms: Anomaly[]) {
  const batch = db.batch();
  const refs: FirebaseFirestore.DocumentReference[] = [];

  for (const a of anoms) {
    const docId = a.id; // prebuilt deterministic id per anomaly
    const ref = db.collection("finance_anomalies").doc(docId);
    batch.set(
      ref,
      {
        ...a,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    refs.push(ref);
  }

  await batch.commit();
  return refs;
}
