"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { toast } from "react-hot-toast";

export default function UserSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [form, setForm] = useState({
    refundPreference: "bank_transfer",
    bankDetails: {
      accountHolder: "",
      accountNumber: "",
      ifsc: "",
      upi: "",
    },
    aadharImageUrl: "",
    aadharNumber: "",
    profilePhotoUrl: "",
  });

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const token = await getFirebaseIdToken();
      const res = await fetch("/api/users/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setForm(data.settings);
        setUserData(data.settings);
      }
    } catch (err) {
      console.error("Error fetching user settings:", err);
    }
  };

  const handleChange = (field: string, value: string) => {
    if (field in form.bankDetails) {
      setForm((prev) => ({
        ...prev,
        bankDetails: { ...prev.bankDetails, [field]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await getFirebaseIdToken();
      const res = await fetch("/api/users/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Settings updated successfully!");
      } else {
        toast.error(data.error || "Failed to update settings");
      }
    } catch (err) {
      console.error("Error updating settings:", err);
      toast.error("Error updating settings");
    } finally {
      setLoading(false);
    }
  };

  // Helper to get Firebase ID Token
  const getFirebaseIdToken = async () => {
    const user = (await import("firebase/auth")).getAuth().currentUser;
    if (user) return await user.getIdToken();
    throw new Error("User not authenticated");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Account Settings</h1>

      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-medium mb-3">Profile</h2>
          <div className="flex items-center gap-4">
            <Image
              src={form.profilePhotoUrl || "/default-avatar.png"}
              alt="Profile"
              width={80}
              height={80}
              className="rounded-full border"
            />
            <Input
              type="url"
              placeholder="Profile Photo URL"
              value={form.profilePhotoUrl}
              onChange={(e) => handleChange("profilePhotoUrl", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-medium mb-3">Aadhaar Record</h2>
          <Input
            type="text"
            placeholder="Aadhaar Number (XXXX-XXXX-1234)"
            value={form.aadharNumber}
            onChange={(e) => handleChange("aadharNumber", e.target.value)}
          />
          <Input
            type="url"
            placeholder="Aadhaar Image URL"
            value={form.aadharImageUrl}
            onChange={(e) => handleChange("aadharImageUrl", e.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-medium mb-3">Refund Preference</h2>
          <select
            value={form.refundPreference}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                refundPreference: e.target.value,
              }))
            }
            className="border rounded-md p-2 w-full"
          >
            <option value="bank_transfer">Bank Transfer</option>
            <option value="upi">UPI</option>
          </select>

          {form.refundPreference === "bank_transfer" && (
            <div className="space-y-3">
              <Input
                placeholder="Account Holder Name"
                value={form.bankDetails.accountHolder}
                onChange={(e) =>
                  handleChange("accountHolder", e.target.value)
                }
              />
              <Input
                placeholder="Account Number"
                value={form.bankDetails.accountNumber}
                onChange={(e) =>
                  handleChange("accountNumber", e.target.value)
                }
              />
              <Input
                placeholder="IFSC Code"
                value={form.bankDetails.ifsc}
                onChange={(e) => handleChange("ifsc", e.target.value)}
              />
            </div>
          )}

          {form.refundPreference === "upi" && (
            <Input
              placeholder="UPI ID (e.g. name@upi)"
              value={form.bankDetails.upi}
              onChange={(e) => handleChange("upi", e.target.value)}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
