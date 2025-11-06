import "server-only";
import { db } from "@/lib/firebaseadmin";
import Link from "next/link";

/* ============================================================
   📊 Admin Wallet Overview
============================================================ */

async function fetchWalletStats() {
  const snap = await db.collection("users").get();

  let totalBalance = 0;
  let totalEarnings = 0;
  const topUsers: {
    uid: string;
    name: string;
    userType: string;
    walletBalance: number;
    totalEarnings: number;
  }[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const walletBalance = data.walletBalance || 0;
    const totalEarn = data.totalEarnings || 0;
    totalBalance += walletBalance;
    totalEarnings += totalEarn;

    topUsers.push({
      uid: doc.id,
      name: data.name || data.displayName || "Unnamed",
      userType: data.userType || "user",
      walletBalance,
      totalEarnings: totalEarn,
    });
  }

  // sort top earners by totalEarnings
  topUsers.sort((a, b) => b.totalEarnings - a.totalEarnings);

  // aggregate by userType
  const byType: Record<string, { count: number; balance: number }> = {};
  topUsers.forEach((u) => {
    if (!byType[u.userType]) byType[u.userType] = { count: 0, balance: 0 };
    byType[u.userType].count++;
    byType[u.userType].balance += u.walletBalance;
  });

  return { totalBalance, totalEarnings, topUsers: topUsers.slice(0, 10), byType };
}

export default async function WalletOverviewPage() {
  const { totalBalance, totalEarnings, topUsers, byType } = await fetchWalletStats();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Wallet Overview</h1>
        <p className="text-sm text-muted-foreground">
          Global summary of all wallet balances and earnings.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-xl">
          <div className="text-sm text-muted-foreground">Total Wallet Balance</div>
          <div className="text-2xl font-semibold">
            ₹{totalBalance.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="p-4 border rounded-xl">
          <div className="text-sm text-muted-foreground">Total Earnings Distributed</div>
          <div className="text-2xl font-semibold">
            ₹{totalEarnings.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="p-4 border rounded-xl">
          <div className="text-sm text-muted-foreground">Total Users</div>
          <div className="text-2xl font-semibold">{Object.values(byType).reduce((a,b)=>a+b.count,0)}</div>
        </div>
      </div>

      {/* Breakdown by Type */}
      <div>
        <h2 className="text-lg font-semibold mt-8 mb-3">By User Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(byType).map(([type, stat]) => (
            <div key={type} className="p-4 border rounded-xl">
              <div className="text-sm text-muted-foreground capitalize">{type}</div>
              <div className="font-semibold text-lg">₹{stat.balance.toLocaleString("en-IN")}</div>
              <div className="text-xs text-muted-foreground">{stat.count} accounts</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Earners */}
      <div>
        <h2 className="text-lg font-semibold mt-8 mb-3">Top Earners</h2>
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-right">Wallet ₹</th>
                <th className="p-3 text-right">Total Earnings ₹</th>
                <th className="p-3 text-right">Wallet Logs</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u) => (
                <tr key={u.uid} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.uid}</div>
                  </td>
                  <td className="p-3 capitalize">{u.userType}</td>
                  <td className="p-3 text-right font-medium">
                    ₹{u.walletBalance.toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-right">
                    ₹{u.totalEarnings.toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/wallet/${u.uid}`}
                      className="px-3 py-1 rounded-lg border hover:bg-black hover:text-white transition"
                    >
                      View Logs
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
