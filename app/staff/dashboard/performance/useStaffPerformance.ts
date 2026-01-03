import { useEffect, useState } from "react";

export type StaffPerformance = {
  totalLeads: number;
  contacted: number;
  callbacks: number;
  converted: number;
};

export function useStaffPerformance(token: string) {
  const [data, setData] = useState<StaffPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/staff/performance", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (res.ok && json.success) {
          setData(json.performance);
        }
      } catch (e) {
        console.error("Performance load failed", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  return { data, loading };
}
