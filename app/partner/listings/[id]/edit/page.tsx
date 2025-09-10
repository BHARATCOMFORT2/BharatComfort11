"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [form, setForm] = useState({
    title: "",
    category: "hotel",
    description: "",
    address: "",
    city: "",
    price: "",
    website: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const ref = doc(db, "listings", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();

          // Only allow the partner who owns this listing
          const user = auth.currentUser;
          if (!user || data.partnerId !== user.uid) {
            throw new Error("Unauthorized access");
          }

          setForm({
            title: data.title || "",
            category: data.category || "hotel",
            description: data.description || "",
            address: data.address || "",
            city: data.city || "",
            price: data.price || "",
            website: data.website || "",
          });
        } else {
          setError("Listing not found");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchListing();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const ref = doc(db, "listings", id);
      await updateDoc(ref, {
        ...form,
        updatedAt: new Date().toISOString(),
        approved: false, // mark for re-approval if updated
      });

      router.push("/partner/listings");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center py-12">Loading...</p>;

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Edit Listing</h1>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow space-y-4"
      >
        <input
          type="text"
          name="title"
          placeholder="Listing Title"
          value={form.title}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          required
        />

        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="w-full p-3 border rounded"
        >
          <option value="hotel">Hotel</option>
          <option value="restaurant">Restaurant</option>
          <option value="travel">Travel</option>
          <option value="other">Other</option>
        </select>

        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          rows={3}
          required
        />

        <input
          type="text"
          name="address"
          placeholder="Address"
          value={form.address}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          required
        />

        <input
          type="text"
          name="city"
          placeholder="City"
          value={form.city}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          required
        />

        <input
          type="number"
          name="price"
          placeholder="Average Price (per night/meal/tour)"
          value={form.price}
          onChange={handleChange}
          className="w-full p-3 border rounded"
        />

        <input
          type="url"
          name="website"
          placeholder="Website (optional)"
          value={form.website}
          onChange={handleChange}
          className="w-full p-3 border rounded"
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Update Listing"}
        </button>
      </form>
    </div>
  );
}
