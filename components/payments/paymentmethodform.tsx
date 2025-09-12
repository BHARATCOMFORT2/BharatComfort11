"use client";

import { useState } from "react";

type PaymentMethodFormProps = {
  onSubmit: (data: { type: string; details: string }) => void;
};

export default function PaymentMethodForm({ onSubmit }: PaymentMethodFormProps) {
  const [method, setMethod] = useState("card");
  const [details, setDetails] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ type: method, details });
    setDetails("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border rounded-lg shadow bg-white max-w-md"
    >
      <h3 className="text-lg font-semibold mb-4">Add Payment Method</h3>

      <label className="block mb-2 text-sm font-medium">Method</label>
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="w-full p-2 border rounded mb-4"
      >
        <option value="card">Credit/Debit Card</option>
        <option value="upi">UPI</option>
        <option value="paypal">PayPal</option>
      </select>

      <label className="block mb-2 text-sm font-medium">
        {method === "card"
          ? "Card Number"
          : method === "upi"
          ? "UPI ID"
          : "PayPal Email"}
      </label>
      <input
        type={method === "card" ? "text" : "email"}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        className="w-full p-2 border rounded mb-4"
        placeholder={
          method === "card"
            ? "1234 5678 9012 3456"
            : method === "upi"
            ? "username@upi"
            : "you@example.com"
        }
        required
      />

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        Save Payment Method
      </button>
    </form>
  );
}
