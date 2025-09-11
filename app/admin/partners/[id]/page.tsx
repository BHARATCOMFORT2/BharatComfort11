"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";

export default function AdminPartnerDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPartner = async () => {
    try {
      const snap = await getDoc(doc(db, "partners", id as string));
      if (snap.exists()) {
        setPartner({ id: snap.id, ...snap.data() });
      }
      const q = query(
        collection(db, "listings"),
        where("partnerId", "==", id)
      );
      const snapListings = await getDocs(q);
      const list: any[] = [];
      snapListings.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setListings(list);
    } catch (err) {
      console.error("Error fetching partner details:", err);
    } finally {
      setLoading(false);
    }
  };

  const updatePartnerStatus = async (status: string) => {
    try {
      await updateDoc(doc(db, "partners", id as string), { status });
      setPartner((prev: any) => ({ ...prev, status }));
    } catch (err) {
      console.error("Error updating partner status:", err);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    // TODO: enforce superadmin check
    fetchPartner();
  }, [id, router]);

  if (loading) return <p className="text-center py-12">Loading...</p>;
  if (!partner) return <p className="text-center py-12">Partner not found.</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Partner Details</h1>

      <div className="mb-6 border rounded-lg shadow p-4 bg-white">
        <h2 className="text-lg font-semibold">{partner.name}</h2>
        <p className="text-gray-600">{partner.email}</p>
        <p className="text-gray-600">Phone: {partner.phone || "N/A"}</p>
        <p className="text-gray-600">
          Status:{" "}
          <select
            value={partner.status || "pending"}
            onChange={(e) => updatePartnerStatus(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="suspended">Suspended</option>
          </select>
        </p>
      </div>

      <h2 className="text-xl font-bold mb-4">Listings by {partner.name}</h2>
      {listings.length > 0 ? (
        <ul className="grid md:grid-cols-2 gap-4">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="border rounded-lg shadow p-4 bg-white"
            >
              <h3 className="text-lg font-semibold">{listing.title}</h3>
              <p className="text-gray-600">{listing.location}</p>
              <p className="text-sm text-gray-500">
                {listing.category || "Uncategorized"}
              </p>
              <button
                onClick={() =>
                  router.push(`/listings/${listing.id}`)
                }
                className="mt-2 text-blue-600 hover:underline text-sm"
              >
                View Listing
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No listings found for this partner.</p>
      )}
    </div>
  );
}
