"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function UserDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ bookings: 0, upcoming: 0, spent: 0 });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const init = async ()=>{
      const user = auth.currentUser;
      if(!user) return router.push("/auth/login");

      const usersSnap = await getDocs(collection(db, "users"));
      const currentUser = usersSnap.docs.find(d => d.id === user.uid);
      if(!currentUser || currentUser.data().role !== "user") {
        alert("❌ Not authorized"); return router.push("/");
      }

      const bookingsSnap = await getDocs(query(collection(db,"bookings"), where("userId","==",user.uid)));

      const totalSpent = bookingsSnap.docs.reduce((sum,b)=>sum+(b.data().amount||0),0);
      const upcoming = bookingsSnap.docs.filter(b=>new Date(b.data().date) > new Date()).length;

      setStats({
        bookings: bookingsSnap.size,
        upcoming,
        spent: totalSpent
      });

      setRecentBookings(bookingsSnap.docs.map(d=>d.data()).sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,5));
      setLoading(false);
    }

    init();
  }, [router]);

  if(loading) return <p className="text-center py-12">Loading dashboard...</p>;

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <header className="flex justify-between mb-8">
        <h1 className="text-2xl font-bold">User Dashboard</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={()=>auth.signOut().then(()=>router.push("/auth/login"))}
        >
          Logout
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {Object.entries(stats).map(([key, value])=>(
          <div key={key} className="p-6 bg-white shadow rounded-2xl text-center">
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white shadow rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
        {recentBookings.length===0 && <p>No bookings yet.</p>}
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {recentBookings.map((b, idx)=>(
            <li key={idx} className="border rounded-lg p-2 flex justify-between">
              <span>{b.listingName || "Trip"}</span>
              <span className="text-gray-400 text-sm">{new Date(b.date).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
