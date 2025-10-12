"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function UserDashboardPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData({ id: user.uid, ...docSnap.data() });
        } else {
          console.warn("⚠️ No user document found for:", user.uid);
        }
      } catch (err) {
        console.error("Error loading user data:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) return <div className="p-6">Loading dashboard...</div>;

  if (!userData) return <div className="p-6">User data not found.</div>;

  return (
    <DashboardLayout
      title="User Dashboard"
      profile={{
        name: userData.name || userData.email || "User",
        role: userData.role || "user",
        profilePic: userData.profilePic || "",
      }}
    >
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">
          Welcome, {userData.name || "User"} 👋
        </h2>
        <p>Your email: {userData.email}</p>
        <p>Role: {userData.role}</p>
        <p className="mt-4 text-gray-500">
          You can view your trips, manage bookings, and update your profile from
          the sidebar.
        </p>
      </div>
    </DashboardLayout>
  );
}
