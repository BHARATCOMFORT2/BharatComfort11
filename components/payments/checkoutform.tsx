"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type CheckoutFormProps = {
  onSubmit: (data: any) => void;
};

export default function CheckoutForm({ onSubmit }: CheckoutFormProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Mock payload for now
      await onSubmit({
        listingId: "123",
        amount: 2500,
        currency: "INR",
      });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 border rounded-lg shadow max-w-lg mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-center">💳 Checkout</h2>
      <p className="text-gray-600 text-center">
        Confirm your booking and proceed to payment.
      </p>

      <Button onClick={handleCheckout} disabled={loading} className="w-full">
        {loading ? "Processing..." : "Pay Now"}
      </Button>
    </div>
  );
}
