// ✅ Force Node.js runtime (server-only)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import "server-only";

import { db } from "@/lib/firebaseadmin";
import { approvePayoutAction } from "./actions"; // ✅ Imported server action
import Link from "next/link";

/**
 * 🔐 Optional: gate this page (middleware already enforces role)
 * This file assumes your middleware blocks non-admins.
 */

type MonthlyStat = {
  uid: string;
  userType: "creator" | "agent";
  totalBookingAmount: number;
  totalPartners: number;
  rewardPercent: number;
  totalReward: number;
  payoutStatus: "pending" | "paid";
  createdAt?: Date;
  paidAt?: Date;
};

function getMonthKeyFromSearch(searchParams: {
  [k: string]: string | string[] | undefined;
}) {
  const raw = (searchParams?.month as string) || "";
  const today = new Date();
  const y = today.getFullYear();
  const m = (today.getMonth() + 1).toString().padStart(2, "0");
  const fallback = `${y}-${m}`;
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : fallback;
}

async function fetchStats(monthKey: string, status: "pending" | "paid") {
  const snap = await db
    .collection("referralStatsMonthly")
    .doc(monthKey)
    .collection("users")
    .where("payoutStatus", "==", status)
    .orderBy("totalReward", "desc")
    .get();

  const items: (MonthlyStat & { id: string; user: any })[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as MonthlyStat;
    const userSnap = await db.collection("users").doc(data.uid).get();
    items.push({
      id: doc.id,
      ...data,
      user: { id: userSnap.id, ...(userSnap.data() || {}) },
    });
  }
  return items;
}

function MonthSwitcher({
  monthKey,
  status,
}: {
  monthKey: string;
  status: "pending" | "paid";
}) {
  const [y, m] = monthKey.split("-").map(Number);
  const prev = new Date(y, m - 2, 1);
  const next = new Date(y, m, 1);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2">
      <Link className="px-3 py-1 rounded border" href={`?month=${fmt(prev)}&status=${status}`}>
        ← {fmt(prev)}
      </Link>
      <span className="text-sm text-muted-foreground">{monthKey}</span>
      <Link className="px-3 py-1 rounded border" href={`?month=${fmt(next)}&status=${status}`}>
        {fmt(next)} →
      </Link>
    </div>
  );
}

export default async function AdminReferralSettlementsPage({
  searchParams,
}: {
  searchParams: { [k: string]: string | string[] | undefined };
}) {
  const monthKey = getMonthKeyFromSearch(searchParams);
  const status = (searchParams?.status as "pending" | "paid") || "pending";

  const items = await fetchStats(monthKey, status);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Referral Settlements</h1>
          <p className="text-sm text-muted-foreground">
            Approve monthly rewards for creators & agents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <MonthSwitcher monthKey={monthKey} status={status} />
          <Link
            href={`?month=${monthKey}&status=pending`}
            className={`px-3 py-1 rounded border ${
              status === "pending" ? "bg-black text-white" : ""
            }`}
          >
            Pending
          </Link>
          <Link
            href={`?month=${monthKey}&status=paid`}
            className={`px-3 py-1 rounded border ${
              status === "paid" ? "bg-black text-white" : ""
            }`}
          >
            Paid
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border">
          <div className="text-sm text-muted-foreground">Total Records</div>
          <div className="text-2xl font-semibold">{items.length}</div>
        </div>
        <div className="p-4 rounded-xl border">
          <div className="text-sm text-muted-foreground">Total Payout</div>
          <div className="text-2xl font-semibold">
            ₹{items.reduce((a, b) => a + (b.totalReward || 0), 0).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="p-4 rounded-xl border">
          <div className="text-sm text-muted-foreground">Month</div>
          <div className="text-2xl font-semibold">{monthKey}</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-3">Creator/Agent</th>
              <th className="text-left p-3">Type</th>
              <th className="text-right p-3">Bookings ₹</th>
              <th className="text-right p-3">Reward %</th>
              <th className="text-right p-3">Payout ₹</th>
              <th className="text-right p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={6}>
                  No {status} records for {monthKey}.
                </td>
              </tr>
            )}

            {items.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">
                    {row.user?.name || row.user?.displayName || row.uid}
                  </div>
                  <div className="text-xs text-muted-foreground">{row.uid}</div>
                </td>
                <td className="p-3">{row.userType}</td>
                <td className="p-3 text-right">
                  ₹{(row.totalBookingAmount || 0).toLocaleString("en-IN")}
                </td>
                <td className="p-3 text-right">{row.rewardPercent}%</td>
                <td className="p-3 text-right font-medium">
                  ₹{(row.totalReward || 0).toLocaleString("en-IN")}
                </td>
                <td className="p-3 text-right">
                  {row.payoutStatus === "pending" ? (
                    <form action={approvePayoutAction}>
                      <input type="hidden" name="monthKey" value={monthKey} />
                      <input type="hidden" name="uid" value={row.uid} />
                      <input type="hidden" name="totalReward" value={row.totalReward} />
                      <input type="hidden" name="docId" value={row.id} />
                      <button
                        className="px-3 py-1 rounded-lg border hover:bg-black hover:text-white transition"
                        type="submit"
                      >
                        Approve & Credit
                      </button>
                    </form>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs rounded-full border">
                      Paid{" "}
                      {row.paidAt
                        ? new Date(row.paidAt).toLocaleDateString("en-IN")
                        : ""}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: set creator/agent percent in <code>referralConfig</code> if you plan
        to vary it later.
      </p>
    </div>
  );
}
