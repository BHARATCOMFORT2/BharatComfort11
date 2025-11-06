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
          <label className="block text-sm font-medium"
