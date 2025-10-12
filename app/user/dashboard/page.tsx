"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { createRazorpayOrder } from "@/lib/payments-razorpay"; // Razorpay server utility

interface Booking {
  id: string;
  listingName?: string;
  date: string;
  amount?: number;
  paymentStatus?: string;
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

export default function UserDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ bookings: 0, upcoming: 0, spent: 0 });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [allStays, setAllStays] = useState<Stay[]>([]);

  // ------------------- Auth & Profile -------------------
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) return router.push("/auth/login");

      setUser(currentUser);

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
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
        const allBookings: Booking[] = snap.docs.map((d) => {
          const data = d.data() as Booking;
          return {
            id: d.id,
            listingName: data.listingName,
            date: data.date,
            amount: data.amount,
            paymentStatus: data.paymentStatus,
          };
        });

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

    const unsubStays = onSnapshot(
      staysQuery,
      (snap) => {
        const stays: Stay[] = snap.docs.map((d) => {
          const data = d.data() as Stay;
          return {
            id: d.id,
            name: data.name,
            location: data.location,
            price: data.price,
            image: data.image,
            bookingsCount: data.bookingsCount,
            partnerId: data.partnerId,
          };
        });

        setAllStays(stays);
      },
      (err) => console.error("Error fetching stays:", err)
    );

    return () => unsubStays();
  }, []);

  // ------------------- Razorpay Payment -------------------
  const handlePay = async (booking: Booking) => {
    try {
      if (!booking.amount) return alert("Booking amount missing!");

      // 1️⃣ Create order via server-side utility
      const order = await createRazorpayOrder(booking.amount);

      // 2️⃣ Razorpay checkout options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "BharatComfort",
        description: `Booking: ${booking.listingName}`,
        order_id: order.id,
        handler: async (res: any) => {
          const bookingRef = doc(db, "bookings", booking.id);
          await updateDoc(bookingRef, {
            paymentStatus: "paid",
            paymentId: res.razorpay_payment_id,
            orderId: res.razorpay_order_id,
          });
          alert("Payment successful ✅");
        },
        prefill: {
          name: profile?.name,
          email: user?.email,
        },
        theme: { color: "#2563EB" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment failed ❌");
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
              <li key={b.id} className="border rounded-lg p-2 flex justify-between items-center">
                <div>
                  <span>{b.listingName || "Trip"}</span>
                  <br />
                  <span className="text-gray-400 text-sm">{new Date(b.date).toLocaleString()}</span>
                </div>
                {b.amount && b.paymentStatus !== "paid" && (
                  <button
                    onClick={() => handlePay(b)}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    Pay ₹{b.amount}
                  </button>
                )}
                {b.paymentStatus === "paid" && (
                  <span className="text-green-600 font-semibold">Paid ✅</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* All Stays */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4">All Listings</h2>
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
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
