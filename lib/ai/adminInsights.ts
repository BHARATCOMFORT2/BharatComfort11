// /lib/ai/adminInsights.ts
import { db } from "@/lib/firebaseadmin";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Pulls core metrics from Firestore and returns AI-generated insights
 */
export async function generateAdminInsights() {
  // --- 1️⃣  Aggregate platform data ---
  const [partnersSnap, bookingsSnap, settlementsSnap] = await Promise.all([
    db.collection("partners").get(),
    db.collection("bookings").get(),
    db.collection("settlements").get(),
  ]);

  const totalPartners = partnersSnap.size;
  const totalBookings = bookingsSnap.size;
  const totalSettlements = settlementsSnap.size;

  const totalRevenue = settlementsSnap.docs.reduce(
    (sum, d) => sum + (Number(d.data().amount) || 0),
    0
  );

  // --- 2️⃣  Compute ratios ---
  const avgRevenuePerPartner = totalPartners
    ? Math.round(totalRevenue / totalPartners)
    : 0;
  const approvalRate =
    partnersSnap.size > 0
      ? Math.round(
          (partnersSnap.docs.filter((d) => d.data().status === "approved")
            .length /
            partnersSnap.size) *
            100
        )
      : 0;

  const prompt = `
You are an AI business analyst for a travel marketplace.
Summarize the following KPIs in a concise, human tone:
- Total Partners: ${totalPartners}
- Total Bookings: ${totalBookings}
- Total Settlements: ${totalSettlements}
- Total Revenue: ₹${totalRevenue.toLocaleString("en-IN")}
- Avg Revenue per Partner: ₹${avgRevenuePerPartner.toLocaleString("en-IN")}
- Partner Approval Rate: ${approvalRate}%

Identify growth trends, highlight potential risks, and suggest one
action for the admin to improve revenue or reduce delays.
Return 3-5 bullet points only.
`;

  // --- 3️⃣  Call OpenAI model ---
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const summary =
    completion.choices[0].message?.content?.trim() ||
    "No insights generated.";

  return {
    stats: {
      totalPartners,
      totalBookings,
      totalSettlements,
      totalRevenue,
      avgRevenuePerPartner,
      approvalRate,
    },
    summary,
  };
}
