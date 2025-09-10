"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const fetchListings = async () => {
      try {
        const q = query(
          collection(db, "listings"),
          where("partnerId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setListings(data);
      } catch (err) {
        console.error("Error fetching listings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Partner Dashboard</h1>

      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">Manage your business listings here.</p>
        <Link
          href="/partner/listings/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add New Listing
        </Link>
      </div>

      {loading ? (
        <p>Loading your listings...</p>
      ) : listings.length === 0 ? (
        <p className="text-gray-500">
          No listings yet. Start by adding one above.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="border rounded-lg p-4 shadow bg-white"
            >
              <h2 className="text-lg font-semibold">{listing.title}</h2>
              <p className="text-sm text-gray-600 mb-2">
                {listing.category} • {listing.city}
              </p>
              <p className="text-gray-700 mb-4 line-clamp-3">
                {listing.description}
              </p>

              <div className="flex justify-between items-center">
                <Link
                  href={`/partner/listings/${listing.id}/edit`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Edit
                </Link>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    listing.approved
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {listing.approved ? "Approved" : "Pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
