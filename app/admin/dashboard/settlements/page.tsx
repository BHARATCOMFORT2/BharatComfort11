"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertTriangle, Ban, Wallet } from "lucide-react";

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "settlements"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSettlements(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAction = async (id: string, action: string) => {
    try {
      setProcessing(id);
      const token = await getAuth().currentUser?.getIdToken();

      const res = await fetch("/api/settlements/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settlementId: id, action }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Settlement ${action} successful.`);
      } else {
        alert(data.error || "Failed to process settlement.");
      }
    } catch (err) {
      console.error(err);
      alert("Action failed.");
    } finally {
      setProcessing(null);
    }
  };

  const getBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-blue-100 text-blue-700",
      paid: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      on_hold: "bg-gray-200 text-gray-600",
    };
    return (
      <Badge className={map[status] || "bg-gray-200 text-gray-700"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-500" size={28} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6 flex items-center">
        <Wallet className="mr-2 text-green-600" /> Settlement Management
      </h2>

      {settlements.length === 0 ? (
        <p className="text-gray-500 text-center">No settlements found.</p>
      ) : (
        <div className="grid gap-4">
          {settlements.map((s) => (
            <Card
              key={s.id}
              className="border rounded-xl shadow-sm hover:shadow-md transition"
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {s.partnerName || "Unknown Partner"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Amount: ₹{(s.amount || 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-gray-400">
                      {s.createdAt?.seconds
                        ? new Date(s.createdAt.seconds * 1000).toLocaleString(
                            "en-IN"
                          )
                        : ""}
                    </p>
                  </div>
                  <div>{getBadge(s.status)}</div>
                </div>

                {s.remark && (
                  <p className="text-xs text-gray-600 mt-2">
                    <b>Remark:</b> {s.remark}
                  </p>
                )}

                {s.hasDispute && (
                  <p className="text-sm text-red-600 mt-2">
                    ⚠️ Dispute Raised on this Settlement
                  </p>
                )}

                <div className="flex gap-3 mt-4">
                  {s.status === "pending" && (
                    <>
                      <Button
                        disabled={processing === s.id}
                        onClick={() => handleAction(s.id, "approve")}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <CheckCircle className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button
                        disabled={processing === s.id}
                        onClick={() => handleAction(s.id, "reject")}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Ban className="mr-1 h-4 w-4" /> Reject
                      </Button>
                      <Button
                        disabled={processing === s.id}
                        onClick={() => handleAction(s.id, "hold")}
                        className="bg-gray-600 hover:bg-gray-700 text-white"
                      >
                        <AlertTriangle className="mr-1 h-4 w-4" /> Hold
                      </Button>
                    </>
                  )}

                  {s.status === "approved" && (
                    <Button
                      disabled={processing === s.id}
                      onClick={() => handleAction(s.id, "markPaid")}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      💸 Mark as Paid
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
