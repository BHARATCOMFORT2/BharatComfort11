"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Loader2 } from "lucide-react";

export default function AdminInsightsPage() {
  const { firebaseUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/admin/ai-insights", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    load();
  }, [firebaseUser]);

  return (
    <DashboardLayout title="AI Admin Insights">
      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500">
          <Loader2 className="animate-spin mr-2" /> Loading AI Insights…
        </div>
      ) : data?.success ? (
        <div className="grid gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-3">
                Platform Statistics
              </h3>
              <ul className="space-y-1 text-gray-700">
                <li>Partners: {data.stats.totalPartners}</li>
                <li>Bookings: {data.stats.totalBookings}</li>
                <li>Settlements: {data.stats.totalSettlements}</li>
                <li>
                  Revenue: ₹{data.stats.totalRevenue.toLocaleString("en-IN")}
                </li>
                <li>
                  Avg/Partner: ₹
                  {data.stats.avgRevenuePerPartner.toLocaleString("en-IN")}
                </li>
                <li>Approval Rate: {data.stats.approvalRate}%</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-3">
                🤖 AI Generated Insights
              </h3>
              <div className="prose text-gray-800 whitespace-pre-line">
                {data.summary}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-center text-red-500 py-10">
          {data?.error || "Failed to load insights."}
        </p>
      )}
    </DashboardLayout>
  );
}
