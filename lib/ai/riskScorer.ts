// lib/ai/riskScorer.ts
import { db, admin } from "@/lib/firebaseadmin";

export type RiskTier = "low" | "medium" | "high" | "critical";

export interface PartnerRiskScore {
  partnerId: string;
  score: number;           // 0-100
  tier: RiskTier;
  summary: Record<string, number>;
  computedAt: Date;
}

/* -----------------------------------------------------
   🧮 1.  Weighted factors
----------------------------------------------------- */
const WEIGHTS = {
  refundRate: 0.25,
  delayedSettlements: 0.2,
  disputes: 0.2,
  anomalies: 0.15,
  avgRating: 0.1,
  kycAge: 0.1,
};

/* -----------------------------------------------------
   🧠 2.  Core compute
----------------------------------------------------- */
export async function computePartnerRisk(partnerId: string): Promise<PartnerRiskScore> {
  const now = new Date();

  // ---- Fetch data in parallel
  const [partnerSnap, settlementsSnap, refundsSnap, anomaliesSnap, disputesSnap, reviewsSnap] =
    await Promise.all([
      db.collection("partners").doc(partnerId).get(),
      db.collection("settlements").where("partnerId", "==", partnerId).get(),
      db.collection("refunds").where("partnerId", "==", partnerId).get(),
      db.collection("finance_anomalies").where("partnerId", "==", partnerId).get(),
      db.collection("disputes").where("partnerId", "==", partnerId).get(),
      db.collection("reviews").where("partnerId", "==", partnerId).get(),
    ]);

  const partner = partnerSnap.data() || {};
  const settlements = settlementsSnap.docs.map((d) => d.data());
  const refunds = refundsSnap.docs.map((d) => d.data());
  const anomalies = anomaliesSnap.docs.map((d) => d.data());
  const disputes = disputesSnap.docs.map((d) => d.data());
  const reviews = reviewsSnap.docs.map((d) => d.data());

  // ---- Refund rate (ratio)
  const totalBookings = partner.totalBookings || 0;
  const refundRate = totalBookings > 0 ? refunds.length / totalBookings : 0;

  // ---- Delayed settlements
  const delayed = settlements.filter(
    (s: any) =>
      (s.status === "pending" || s.status === "approved") &&
      s.createdAt?.toDate &&
      s.createdAt.toDate() < new Date(Date.now() - 7 * 86400000)
  ).length;
  const delayedRatio = settlements.length ? delayed / settlements.length : 0;

  // ---- Dispute ratio
  const disputeRatio = disputes.length / Math.max(totalBookings, 1);

  // ---- Anomaly density
  const anomalyFactor = anomalies.length / Math.max(totalBookings, 10);

  // ---- Avg rating inverse risk
  const ratings = reviews.map((r: any) => r.rating || 0);
  const avgRating = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 4.5;

  // ---- KYC age (months)
  const kycUpdated = partner.kyc?.updatedAt?.toDate?.() as Date | undefined;
  const monthsSinceKyc = kycUpdated
    ? (now.getTime() - kycUpdated.getTime()) / (30 * 86400000)
    : 12;

  /* -----------------------------------------------------
     3.  Weighted risk score (higher = riskier)
  ----------------------------------------------------- */
  const risk =
    refundRate * WEIGHTS.refundRate * 100 +
    delayedRatio * WEIGHTS.delayedSettlements * 100 +
    disputeRatio * WEIGHTS.disputes * 100 +
    anomalyFactor * WEIGHTS.anomalies * 100 +
    ((5 - avgRating) / 5) * WEIGHTS.avgRating * 100 +
    (monthsSinceKyc / 24) * WEIGHTS.kycAge * 100;

  const score = Math.min(100, Math.round(risk));

  const tier: RiskTier =
    score >= 75 ? "critical" : score >= 55 ? "high" : score >= 35 ? "medium" : "low";

  const summary = {
    refundRate: Number((refundRate * 100).toFixed(1)),
    delayedRatio: Number((delayedRatio * 100).toFixed(1)),
    disputeRatio: Number((disputeRatio * 100).toFixed(1)),
    anomalies: anomalies.length,
    avgRating: Number(avgRating.toFixed(2)),
    monthsSinceKyc: Number(monthsSinceKyc.toFixed(1)),
  };

  return { partnerId, score, tier, summary, computedAt: now };
}

/* -----------------------------------------------------
   4.  Batch compute & save
----------------------------------------------------- */
export async function runFullRiskScan() {
  const partnersSnap = await db.collection("partners").get();
  const results: PartnerRiskScore[] = [];

  for (const doc of partnersSnap.docs) {
    const res = await computePartnerRisk(doc.id);
    results.push(res);
  }

  const batch = db.batch();
  for (const r of results) {
    const ref = db.collection("partner_risk_scores").doc(r.partnerId);
    batch.set(ref, {
      ...r,
      computedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  return results;
}
