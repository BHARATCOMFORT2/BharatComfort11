"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function AdminSystemSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const ref = doc(db, "system", "global");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setSettings(snap.data());
      } else {
        // default config
        setSettings({
          notificationsEnabled: true,
          featuredListingsLimit: 5,
          paymentGateway: "stripe",
        });
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    // TODO: enforce superadmin check
    fetchSettings();
  }, [router]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "system", "global"), settings, { merge: true });
      alert("Settings updated successfully ✅");
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center py-12">Loading system settings...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">System Settings</h1>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* Notifications */}
        <div>
          <label className="font-semibold block mb-2">Enable Notifications</label>
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(e) =>
              setSettings({ ...settings, notificationsEnabled: e.target.checked })
            }
          />
        </div>

        {/* Featured Listings Limit */}
        <div>
          <label className="font-semibold block mb-2">
            Featured Listings Limit
          </label>
          <input
            type="number"
            value={settings.featuredListingsLimit}
            onChange={(e) =>
              setSettings({
                ...settings,
                featuredListingsLimit: Number(e.target.value),
              })
            }
            className="border px-2 py-1 rounded w-24"
          />
        </div>

        {/* Payment Gateway */}
        <div>
          <label className="font-semibold block mb-2">Payment Gateway</label>
          <select
            value={settings.paymentGateway}
            onChange={(e) =>
              setSettings({ ...settings, paymentGateway: e.target.value })
            }
            className="border px-2 py-1 rounded"
          >
            <option value="stripe">Stripe</option>
            <option value="razorpay">Razorpay</option>
            <option value="paypal">PayPal</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
