import { useEffect, useState } from "react";

export type StaffEarnings = {
  total: number;
  weekly: number;
  monthly: number;
  updatedAt?: any;
};

export function useStaffEarnings(token: string) {
  const [data, setData] = useState<StaffEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/staff/earnings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (res.ok && json.success) {
          setData(json.earnings);
        }
      } catch (e) {
        console.error("Earnings load failed", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  return { data, loading };
}
