"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function StaffDashboardPage() {
  const router = useRouter();
  const [staffData, setStaffData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        const ref = doc(db, "staffs", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          router.push("/"); // not a staff, redirect
          return;
        }

        setStaffData(snap.data());
      } catch (err) {
        console.error("Error fetching staff:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [router]);

  if (loading) return <p className="text-center py-12">Loading...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">Staff Dashboard</h1>
      <p className="text-gray-600">
        Welcome, <span className="font-semibold">{staffData?.name}</span>
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Role: {staffData?.role || "Staff"}
      </p>

      {/* Example actions based on role */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {staffData?.role === "Moderator" && (
          <div className="p-4 border rounded-lg bg-white shadow">
            <h2 className="font-semibold mb-2">Manage Listings</h2>
            <button
              onClick={() => router.push("/staffs/listings")}
              className="text-blue-600 hover:underline text-sm"
            >
              Review Listings
            </button>
          </div>
        )}

        {staffData?.role === "Content Manager" && (
          <div className="p-4 border rounded-lg bg-white shadow">
            <h2 className="font-semibold mb-2">Manage Stories</h2>
            <button
              onClick={() => router.push("/staffs/stories")}
              className="text-blue-600 hover:underline text-sm"
            >
              Review Stories
            </button>
          </div>
        )}

        {staffData?.role === "Support" && (
          <div className="p-4 border rounded-lg bg-white shadow">
            <h2 className="font-semibold mb-2">User Support</h2>
            <button
              onClick={() => router.push("/staffs/support")}
              className="text-blue-600 hover:underline text-sm"
            >
              Handle Tickets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
