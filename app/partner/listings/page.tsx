"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function PartnerListingsPage() {
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
        console.error("Error fetching partner listings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">My Listings</h1>

      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">All the listings you’ve created.</p>
        <Link
          href="/partner/listings/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add New Listing
        </Link>
      </div>

      {loading ? (
        <p>Loading listings...</p>
      ) : listings.length === 0 ? (
        <p className="text-gray-500">
          No listings found. Click “Add New Listing” to create one.
        </p>
      ) : (
        <table className="w-full border-collapse bg-white shadow rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Category</th>
              <th className="p-3">City</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id} className="border-t">
                <td className="p-3">{listing.title}</td>
                <td className="p-3">{listing.category}</td>
                <td className="p-3">{listing.city}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      listing.approved
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {listing.approved ? "Approved" : "Pending"}
                  </span>
                </td>
                <td className="p-3">
                  <Link
                    href={`/partner/listings/${listing.id}/edit`}
                    className="text-blue-600 hover:underline text-sm mr-3"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/listings/${listing.id}`}
                    className="text-gray-600 hover:underline text-sm"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
