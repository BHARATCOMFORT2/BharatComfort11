"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDoc,
  doc,
  addDoc,
} from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { openRazorpayCheckout } from "@/lib/payments-razorpay";

interface Booking {
  id: string;
  listingName?: string;
  date: string;
  amount?: number;
}

interface Stay {
  id: string;
  name: string;
  location: string;
  price: number;
  image?: string;
  bookingsCount?: number;
  partnerId?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
}

export default function UserDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ bookings: 0, upcoming: 0, spent: 0 });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [allStays, setAllStays] = useState<Stay[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // ------------------- Auth & Profile -------------------
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) return router.push("/auth/login");
      setUser(currentUser);

      try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (!userSnap.exists()) {
          alert("Profile not found!");
          return router.push("/");
        }
        const data = userSnap.data();
        if (data.role !== "user") {
          alert("Not authorized");
          return router.push("/");
        }
        setProfile(data);
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  // ------------------- Real-time bookings -------------------
  useEffect(() => {
    if (!user) return;

    const bookingsQuery = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(
      bookingsQuery,
      (snap) => {
        const allBookings: Booking[] = snap.docs.map((d) => ({
          id: d.id,
          listingName: d.data().listingName,
          date: d.data().date,
          amount: d.data().amount,
        }));

        const totalSpent = allBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
        const upcoming = allBookings.filter((b) => b.date && new Date(b.date) > new Date()).length;

        setStats({ bookings: allBookings.length, upcoming, spent: totalSpent });
        setRecentBookings(allBookings.slice(0, 5));
      },
      (err) => console.error("Error fetching bookings:", err)
    );

    return () => unsub();
  }, [user]);

  // ------------------- Real-time stays -------------------
  useEffect(() => {
    const staysQuery = query(collection(db, "stays"), orderBy("bookingsCount", "desc"));
    const unsub = onSnapshot(
      staysQuery,
      (snap) => {
        const stays: Stay[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          location: d.data().location,
          price: d.data().price,
          image: d.data().image,
          bookingsCount: d.data().bookingsCount,
          partnerId: d.data().partnerId,
        }));
        setAllStays(stays);
      },
      (err) => console.error("Error fetching stays:", err)
    );
    return () => unsub();
  }, []);

  // ------------------- Real-time notifications -------------------
  useEffect(() => {
    if (!user) return;

    const notifQuery = query(
      collection(db, "notifications"),
      where("userId", "in", [user.uid, "all"])
    );

    const unsub = onSnapshot(
      notifQuery,
      (snap) => {
        const allNotifs: Notification[] = snap.docs.map((d) => ({
          id: d.id,
          title: d.data().title,
          message: d.data().message,
        }));
        setNotifications(allNotifs);
      },
      (err) => console.error("Error fetching notifications:", err)
    );

    return () => unsub();
  }, [user]);

  // ------------------- Razorpay Booking -------------------
  const handleBook = async (stay: Stay) => {
    if (!user) return alert("Login required");

    try {
      // 1️⃣ Create Razorpay order via server
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: stay.price }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const orderId = data.order.id;

      // 2️⃣ Open Razorpay checkout
      openRazorpayCheckout({
        amount: stay.price,
        orderId,
        name: user.displayName || "User",
        email: user.email || "",
        onSuccess: async (response) => {
          console.log("Payment success:", response);

          // 3️⃣ Save booking
          await addDoc(collection(db, "bookings"), {
            userId: user.uid,
            partnerId: stay.partnerId || "",
            listingId: stay.id,
            listingName: stay.name,
            amount: stay.price,
            date: new Date().toISOString(),
            paymentId: response.razorpay_payment_id,
            status: "paid",
            createdAt: new Date().toISOString(),
          });

          alert("Booking successful ✅");
        },
        onFailure: (err) => {
          console.error("Payment failed:", err);
          alert("Payment failed ❌");
        },
      });
    } catch (err: any) {
      console.error("Booking error:", err);
      alert("Error: " + err.message);
    }
  };

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;
  if (!profile) return <p className="text-center py-12 text-red-500">Profile not found!</p>;

  return (
    <DashboardLayout
      title="User Dashboard"
      profile={{ name: profile.name, role: "user", profilePic: profile.profilePic }}
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="p-6 bg-white shadow rounded-2xl text-center">
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white shadow rounded-2xl p-6 mb-12">
        <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
        {recentBookings.length === 0 ? (
          <p>No bookings yet.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {recentBookings.map((b) => (
              <li key={b.id} className="border rounded-lg p-2 flex justify-between">
                <span>{b.listingName || "Trip"}</span>
                <span className="text-gray-400 text-sm">{new Date(b.date).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white shadow rounded-2xl p-6 mb-12">
        <h3 className="text-lg font-semibold mb-4">Notifications</h3>
        {notifications.length === 0 ? (
          <p>No notifications</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.id} className="border rounded-lg p-2 bg-gray-50">
                <p className="font-medium">{n.title}</p>
                <p className="text-gray-600 text-sm">{n.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* All Stays / Book Now */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Available Stays</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allStays.map((stay) => (
            <div key={stay.id} className="bg-white shadow rounded-2xl p-4 flex flex-col">
              <img
                src={stay.image || "/default-stay.jpg"}
                alt={stay.name}
                className="w-full h-48 object-cover rounded-xl mb-2 shadow"
              />
              <h3 className="font-semibold text-lg">{stay.name}</h3>
              <p className="text-gray-500">{stay.location}</p>
              <p className="text-indigo-600 font-bold mt-1">₹{stay.price}</p>
              <button
                onClick={() => handleBook(stay)}
                className="mt-3 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700"
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
