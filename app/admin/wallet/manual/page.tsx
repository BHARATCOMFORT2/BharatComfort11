"use client";

import { useState, useTransition } from "react";
import { toast, Toaster } from "sonner";

/**
 * 🧮 Admin Manual Wallet Adjustment Page
 * Allows credit/debit with reason, userType agnostic
 */
export default function ManualWalletPage() {
  const [uid, setUid] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !amount || !reason) {
      toast.error("All fields are required");
      return;
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Invalid amount");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/wallet/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, amount: amt, type, reason }),
        });

        if (res.ok) {
          toast.success("✅ Wallet updated successfully");
          setUid("");
          setAmount("");
          setReason("");
        } else {
          const data = await res.json();
          toast.error(`⚠️ ${data.error || "Operation failed"}`);
        }
      } catch (err) {
        console.error(err);
        toast.error("❌ Network or server error");
      }
    });
  };

  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto">
      <Toaster richColors closeButton />
      <div>
        <h1 className="text-2xl font-semibold">Manual Wallet Adjustment</h1>
        <p className="text-sm text-muted-foreground">
          Credit or debit any user’s wallet with a reason (logged automatically).
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border p-6 rounded-2xl shadow-sm space-y-4 bg-white/70"
      >
        <div>
          <label className="block text-sm font-medium">User ID (UID)</label>
          <input
            type="text"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="Enter user's UID"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="mt-1 w-full rounded-lg border px-3 py-2 bg-white"
            >
              <option value="credit">Credit (+)</option>
              <option value="debit">Debit (−)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Reason / Notes</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Bonus for campaign, Refund, Manual adjustment..."
            className="mt-1 w-full rounded-lg border px-3 py-2 h-24"
          />
        </div>

        <div className="flex justify-end">
          <button
            disabled={isPending}
            type="submit"
            className="px-5 py-2 rounded-lg border font-medium hover:bg-black hover:text-white transition"
          >
            {isPending ? "Processing..." : "Submit Adjustment"}
          </button>
        </div>
      </form>

      <p className="text-xs text-muted-foreground">
        ⚠️ All manual adjustments are logged under
        <code> users/{'{uid}'}/wallet </code> and appear in wallet overview.
      </p>
    </div>
  );
}
