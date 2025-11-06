import "server-only";
import { db } from "@/lib/firebaseadmin";

export default async function WalletUserPage({
  params,
}: {
  params: { uid: string };
}) {
  const uid = params.uid;
  const userSnap = await db.collection("users").doc(uid).get();
  const user = userSnap.data();

  const logsSnap = await db
    .collection("users")
    .doc(uid)
    .collection("wallet")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Wallet Logs</h1>
        <p className="text-sm text-muted-foreground">{user?.name || uid}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-xl">
          <div className="text-sm text-muted-foreground">Wallet Balance</div>
          <div className="text-2xl font-semibold">
            ₹{(user?.walletBalance || 0).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="p-4 border rounded-xl">
          <div className="text-sm text-muted-foreground">Total Earnings</div>
          <div className="text-2xl font-semibold">
            ₹{(user?.totalEarnings || 0).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="p-4 border rounded-xl">
          <div className="text-sm text-muted-foreground">User Type</div>
          <div className="text-lg capitalize">{user?.userType || "user"}</div>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-right">Amount ₹</th>
              <th className="p-3 text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {logsSnap.empty && (
              <tr>
                <td
                  className="p-4 text-center text-muted-foreground"
                  colSpan={4}
                >
                  No wallet transactions found.
                </td>
              </tr>
            )}
            {logsSnap.docs.map((doc) => {
              const d = doc.data();
              return (
                <tr key={doc.id} className="border-t">
                  <td className="p-3 capitalize">{d.type}</td>
                  <td className="p-3 text-xs">{d.source}</td>
                  <td className="p-3 text-right">
                    ₹{(d.amount || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-right text-xs">
                    {d.createdAt
                      ? new Date(d.createdAt._seconds * 1000).toLocaleString(
                          "en-IN"
                        )
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
