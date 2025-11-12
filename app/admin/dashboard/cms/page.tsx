"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getIdToken } from "firebase/auth";

type HomepageCMS = {
  title?: string;
  subtitle?: string;
  bannerImage?: string;
  trendingDestinations?: string[];
  offers?: { title: string; discount: string }[];
  updatedAt?: any;
};

export default function AdminCMSPage() {
  const [cms, setCMS] = useState<HomepageCMS>({
    title: "",
    subtitle: "",
    bannerImage: "",
    trendingDestinations: [],
    offers: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newDestination, setNewDestination] = useState("");
  const [newOffer, setNewOffer] = useState({ title: "", discount: "" });

  useEffect(() => {
    const ref = doc(collection(db, "homepage_cms"), "main");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setCMS(snap.data() as HomepageCMS);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const user = auth.currentUser;
      if (!user) return alert("Admin not authenticated.");
      const token = await getIdToken(user, true);

      const res = await fetch("/api/admin/homepage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...cms,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save CMS data");
      }

      alert("CMS updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addDestination = () => {
    if (!newDestination.trim()) return;
    setCMS((s) => ({
      ...s,
      trendingDestinations: [...(s.trendingDestinations || []), newDestination],
    }));
    setNewDestination("");
  };

  const addOffer = () => {
    if (!newOffer.title.trim() || !newOffer.discount.trim()) return;
    setCMS((s) => ({
      ...s,
      offers: [...(s.offers || []), newOffer],
    }));
    setNewOffer({ title: "", discount: "" });
  };

  return (
    <DashboardLayout title="Admin • CMS Management">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Homepage CMS Editor
        </h2>

        {loading ? (
          <p className="text-center text-gray-500 py-12">Loading CMS data…</p>
        ) : (
          <div className="space-y-6">
            {/* Title and Subtitle */}
            <div>
              <label className="block text-sm text-gray-700">Homepage Title</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={cms.title || ""}
                onChange={(e) => setCMS((s) => ({ ...s, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Subtitle</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={cms.subtitle || ""}
                onChange={(e) => setCMS((s) => ({ ...s, subtitle: e.target.value }))}
              />
            </div>

            {/* Banner */}
            <div>
              <label className="block text-sm text-gray-700">Banner Image URL</label>
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={cms.bannerImage || ""}
                onChange={(e) =>
                  setCMS((s) => ({ ...s, bannerImage: e.target.value }))
                }
              />
              {cms.bannerImage && (
                <img
                  src={cms.bannerImage}
                  alt="Banner Preview"
                  className="mt-3 h-40 w-full rounded-lg object-cover shadow"
                />
              )}
            </div>

            {/* Trending Destinations */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Trending Destinations
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  className="flex-1 rounded-lg border p-2"
                  placeholder="Add destination"
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                />
                <button
                  onClick={addDestination}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(cms.trendingDestinations || []).map((d, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Offers */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Promotions / Offers
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  className="flex-1 rounded-lg border p-2"
                  placeholder="Offer title"
                  value={newOffer.title}
                  onChange={(e) =>
                    setNewOffer((s) => ({ ...s, title: e.target.value }))
                  }
                />
                <input
                  className="w-32 rounded-lg border p-2"
                  placeholder="% off"
                  value={newOffer.discount}
                  onChange={(e) =>
                    setNewOffer((s) => ({ ...s, discount: e.target.value }))
                  }
                />
                <button
                  onClick={addOffer}
                  className="rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700"
                >
                  Add
                </button>
              </div>
              <ul className="divide-y">
                {(cms.offers || []).map((o, i) => (
                  <li key={i} className="flex justify-between py-2 text-sm">
                    <span>{o.title}</span>
                    <span className="text-green-600 font-medium">
                      {o.discount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`rounded-lg px-4 py-2 text-white ${
                  saving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* === SAMPLE DATA TOOLS SECTION === */}
      <div className="mt-12 border-t pt-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
          🧪 Sample Data Tools
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Generate or delete <strong>realistic sample data</strong> (destinations, hotels,
          stories, reviews, etc.) for testing and UI previews. <br />
          <span className="text-red-600 font-medium">
            All generated data includes <code>isSample: true</code> and <code>seedId</code> so
            you can safely delete it later.
          </span>
        </p>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Generate Sample Data */}
          <button
            onClick={async () => {
              if (!confirm("⚠️ Generate homepage + ecosystem sample data?")) return;
              try {
                const home = await fetch("/api/admin/seed-homepage-sample?action=seed");
                const homeData = await home.json();
                const eco = await fetch("/api/admin/seed-sample-ecosystem?action=seed");
                const ecoData = await eco.json();

                alert(
                  `✅ Sample data generated successfully!\n\nHomepage Seed ID: ${homeData.seedId}\nEcosystem Seed ID: ${ecoData.seedId}`
                );
              } catch (err: any) {
                alert("Error generating sample data: " + err.message);
              }
            }}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium px-4 py-2 rounded-lg shadow"
          >
            ⚡ Generate Sample Data
          </button>

          {/* Delete Sample Data */}
          <button
            onClick={async () => {
              const seedId = prompt("Enter Seed ID to delete:");
              if (!seedId) return;
              if (!confirm(`Delete all sample data for Seed ID: ${seedId}?`)) return;
              try {
                const homeDel = await fetch(
                  `/api/admin/seed-homepage-sample?action=delete&seedId=${seedId}`
                );
                const ecoDel = await fetch(
                  `/api/admin/seed-sample-ecosystem?action=delete&seedId=${seedId}`
                );
                const homeJson = await homeDel.json();
                const ecoJson = await ecoDel.json();
                alert(
                  `🗑️ Deleted sample data.\n\nHomepage: ${homeJson.message}\nEcosystem: ${ecoJson.message}`
                );
              } catch (err: any) {
                alert("Error deleting sample data: " + err.message);
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg shadow"
          >
            🗑️ Delete Sample Data
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
