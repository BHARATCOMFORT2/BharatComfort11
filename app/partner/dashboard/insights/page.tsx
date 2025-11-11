"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Loader2 } from "lucide-react";

export default function PartnerInsightsPage() {
  const { firebaseUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/partner/ai-insights", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    load();
  }, [firebaseUser]);

  return (
    <DashboardLayout title="AI Performance Coach">
      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500">
          <Loader2 className="animate-spin mr-2" /> Analyzing performance…
        </div>
      ) : data?.success ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-3xl font-bold text-green-600">
                AI Score {data.insights.score}/100
              </h2>
              <p className="text-gray-600 mt-2">{data.insights.summary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-3">Recommendations</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                {data.insights.recommendations?.map((tip: string, i: number) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-3">Stats Overview</h3>
              <ul className="space-y-1 text-gray-700">
                <li>Listings: {data.insights.listings}</li>
                <li>Bookings: {data.insights.bookings}</li>
                <li>Completed: {data.insights.completedBookings}</li>
                <li>Cancelled: {data.insights.cancelledBookings}</li>
                <li>Avg Rating: {data.insights.avgRating}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-center text-red-500 py-10">
          {data?.error || "No AI insights available"}
        </p>
      )}
    </DashboardLayout>
  );
}
