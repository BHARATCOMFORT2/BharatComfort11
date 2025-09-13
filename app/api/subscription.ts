import type { NextApiRequest, NextApiResponse } from "next";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { plan } = req.body;

  // Example: define plans
  const plans: Record<string, { planId: string }> = {
    premium: { planId: "plan_ABC123" }, // Replace with real Razorpay Plan ID
    enterprise: { planId: "plan_XYZ456" },
  };

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: plans[plan].planId,
      customer_notify: 1,
      total_count: 12, // 12 months
    });

    res.status(200).json({ subscriptionId: subscription.id });
  } catch (err: any) {
    console.error("Error creating subscription:", err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
}
