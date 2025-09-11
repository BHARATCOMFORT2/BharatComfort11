"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { auth } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ⚡ Load Stripe outside component to avoid recreating it
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // These would be passed as query params or props
  const listingId = searchParams.get("listingId");
  const amount = Number(searchParams.get("amount") || 0);

  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setLoading(true);
    try {
      const stripe = await stripePromise;

      // Create payment session on backend (API route)
      const res = await fetch("/api/payments/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          amount,
          userId: user.uid,
          email: user.email,
        }),
      });

      const session = await res.json();

      if (stripe) {
        await stripe.redirectToCheckout({ sessionId: session.id });
      }

      // Store pending payment in Firestore
      await addDoc(collection(db, "payments"), {
        listingId,
        userId: user.uid,
        amount,
        status: "pending",
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!listingId || !amount) {
    return <p className="text-center py-12">Invalid checkout request.</p>;
  }

  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <p className="mb-4">You’re booking for listing <strong>{listingId}</strong></p>
      <p className="mb-8 text-xl">Amount: <strong>₹{amount.toLocaleString("en-IN")}</strong></p>

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Proceed to Payment"}
      </button>
    </div>
  );
}
