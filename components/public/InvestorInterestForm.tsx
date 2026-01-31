"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function InvestorInterestForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    investorType: "",
    investmentRange: "",
    background: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (k: string, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.email || !form.phone) {
      alert("Name, Email and Phone are required");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/investor-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!data.success) throw new Error("Submission failed");

      setSuccess(true);
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-10">
        <h3 className="text-xl font-semibold mb-2">
          Thank you for your interest!
        </h3>
        <p className="text-gray-600">
          Our team will contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        className="border p-2 w-full rounded"
        placeholder="Full Name"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
      />

      <input
        className="border p-2 w-full rounded"
        placeholder="Email"
        value={form.email}
        onChange={(e) => update("email", e.target.value)}
      />

      <input
        className="border p-2 w-full rounded"
        placeholder="Phone"
        value={form.phone}
        onChange={(e) => update("phone", e.target.value)}
      />

      <select
        className="border p-2 w-full rounded"
        value={form.investorType}
        onChange={(e) => update("investorType", e.target.value)}
      >
        <option value="">Investor Type</option>
        <option>Angel Investor</option>
        <option>Individual</option>
        <option>Firm</option>
      </select>

      <select
        className="border p-2 w-full rounded"
        value={form.investmentRange}
        onChange={(e) => update("investmentRange", e.target.value)}
      >
        <option value="">Investment Range</option>
        <option>₹5–10 Lakhs</option>
        <option>₹10–50 Lakhs</option>
        <option>₹50 Lakhs+</option>
      </select>

      <textarea
        className="border p-2 w-full rounded"
        placeholder="Background / Experience"
        rows={2}
        value={form.background}
        onChange={(e) => update("background", e.target.value)}
      />

      <textarea
        className="border p-2 w-full rounded"
        placeholder="Why do you want to invest?"
        rows={3}
        value={form.message}
        onChange={(e) => update("message", e.target.value)}
      />

      <Button onClick={submit} disabled={loading}>
        {loading ? "Submitting..." : "Submit Interest"}
      </Button>
    </div>
  );
}
