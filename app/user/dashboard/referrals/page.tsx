"use client";

import { useEffect, useState } from "react";

export default function ReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/referrals");
        if (!res.ok) throw new Error("Failed to load referrals");

        const data = await res.json();
        setReferralCode(data.referralCode);
        setReferrals(data.referrals);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <p className="p-4">Loading...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Refer & Earn</h1>

      {/* Referral Code */}
      <div className="mb-6 p-4 border rounded-md bg-white shadow-sm">
        <h2 className="font-semibold">Your Referral Code</h2>
        <p className="text-lg font-mono mt-1">
          {referralCode?.code || "Not created yet"}
        </p>
      </div>

      {/* Referral History */}
      <div>
        <h2 className="font-semibold mb-3">Your Referrals</h2>

        {referrals.length === 0 ? (
          <p>No referrals yet.</p>
        ) : (
          <ul className="space-y-3">
            {referrals.map((ref) => (
              <li
                key={ref.id}
                className="p-4 border rounded-md bg-white shadow-sm"
              >
                <p>Email: {ref.referredEmail}</p>
                <p>Status: {ref.rewardStatus || "Pending"}</p>
                <p className="text-sm text-gray-500">
                  {new Date(ref.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
