// /lib/ai/partnerCoach.ts
import { db } from "@/lib/firebaseadmin";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generatePartnerInsights(partnerId: string) {
  // --- 1️⃣  Gather partner data ---
  const [partnerSnap, listingsSnap, bookingsSnap, reviewsSnap] = await Promise.all([
    db.collection("partners").doc(partnerId).get(),
    db.collection("listings").where("createdBy", "==", partnerId).get(),
    db.collection("bookings").where("partnerId", "==", partnerId).get(),
    db.collection("reviews").where("partnerId", "==", partnerId).get(),
  ]);

  if (!partnerSnap.exists) throw new Error("Partner not found");
  const partner = partnerSnap.data() || {};

  const stats = {
    listings: listingsSnap.size,
    bookings: bookingsSnap.size,
    reviews: reviewsSnap.size,
    avgRating:
      reviewsSnap.size > 0
        ? (
            reviewsSnap.docs.reduce((a, b) => a + (b.data().rating || 0), 0) /
            reviewsSnap.size
          ).toFixed(1)
        : "N/A",
    completedBookings: bookingsSnap.docs.filter(
      (d) => d.data().status === "completed"
    ).length,
    cancelledBookings: bookingsSnap.docs.filter(
      (d) => d.data().status === "cancelled"
    ).length,
  };

  const cancellationRate =
    stats.bookings > 0
      ? Math.round((stats.cancelledBookings / stats.bookings) * 100)
      : 0;

  // --- 2️⃣  AI prompt ---
  const prompt = `
You are an expert travel marketplace coach.
Analyze this partner’s performance and generate a brief 5-point improvement report.

Partner data:
- Listings: ${stats.listings}
- Total Bookings: ${stats.bookings}
- Completed Bookings: ${stats.completedBookings}
- Cancelled Bookings: ${stats.cancelledBookings} (${cancellationRate}%)
- Average Review Rating: ${stats.avgRating}
- Business Name: ${partner.businessName || "N/A"}
- KYC Status: ${partner.kyc?.status || "pending"}

Return JSON with:
{
  "score": number (1-100),
  "summary": string (2-3 sentences),
  "recommendations": string[] (3-5 short tips)
}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  let parsed;
  try {
    parsed = JSON.parse(completion.choices[0].message?.content || "{}");
  } catch {
    parsed = { score: 50, summary: "AI summary unavailable", recommendations: [] };
  }

  return { ...stats, ...parsed };
}
