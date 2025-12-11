"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

/* ---------------------------------------
   TYPES
---------------------------------------- */
type StaffDoc = {
  name?: string;
  profilePic?: string;
  status?: string;
  isActive?: boolean;
  role?: string;
  aadhaar?: {
    last4?: string;
    verified?: boolean;
    imageUrl?: string;
  };
  bank?: {
    holderName?: string;
    bankName?: string;
    ifsc?: string;
    last4?: string;
    verified?: boolean;
  };
};

/* ---------------------------------------
   COMPONENT
---------------------------------------- */
export default function StaffSettingsPage() {
  const router = useRouter();

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [staffDoc, setStaffDoc] = useState<StaffDoc | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [savingBasic, setSavingBasic] = useState(false);
  const [savingAadhaar, setSavingAadhaar] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  // Basic
  const [name, setName] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);

  // Aadhaar (safe mode)
  const [aadhaarNumberInput, setAadhaarNumberInput] = useState("");
  const [aadhaarImageFile, setAadhaarImageFile] = useState<File | null>(null);

  // Bank
  const [bankHolderName, setBankHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankAccountNumberInput, setBankAccountNumberInput] = useState("");

  /* ---------------------------------------
     ✅ AUTH + FETCH STAFF DOC
  ---------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthUser(null);
        setLoadingUser(false);
        router.push("/staff/login");
        return;
      }

      try {
        const ref = doc(db, "staff", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          await signOut(auth);
          toast.error("Staff profile not found");
          router.push("/staff/login");
          return;
        }

        const data = snap.data() as StaffDoc;

        if (data.status !== "approved" || data.isActive !== true) {
          await signOut(auth);
          toast("Account not active", { icon: "⏳" });
          router.push("/staff/login");
          return;
        }

        // Save auth + staff doc
        setAuthUser(user);
        setStaffDoc(data);

        // Prefill basic
        setName(
          data.name ||
            user.displayName ||
            user.email?.split("@")[0] ||
            ""
        );
        if (data.profilePic) setProfilePicUrl(data.profilePic);

        // Prefill Aadhaar masked (if any)
        if (data.aadhaar?.last4) {
          setAadhaarNumberInput("**** **** **** " + data.aadhaar.last4);
        }

        // Prefill bank (masked)
        if (data.bank) {
          setBankHolderName(data.bank.holderName || "");
          setBankName(data.bank.bankName || "");
          setBankIfsc(data.bank.ifsc || "");
          // account number cannot be restored, show only masked in UI
        }
      } catch (err) {
        console.error("Staff settings load error:", err);
        toast.error("Failed to load staff settings");
        router.push("/staff/login");
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsub();
  }, [router]);

  /* ---------------------------------------
     ✅ UPLOAD PROFILE PIC (calls server API)
     - Returns uploaded image url on success
  ---------------------------------------- */
  async function uploadProfilePic(): Promise<string | null> {
    if (!profilePicFile || !authUser) return null;

    try {
      const formData = new FormData();
      formData.append("profilePic", profilePicFile);

      const res = await fetch("/api/staff/profile/update-profile-pic", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await authUser.getIdToken()}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Profile upload failed");
      }

      return data.url || data.imageUrl || null;
    } catch (err: any) {
      console.error("Profile upload error:", err);
      toast.error(err?.message || "Profile upload failed");
      return null;
    }
  }

  /* ---------------------------------------
     ✅ BASIC PROFILE SAVE (Name + optional profile pic upload)
     Option A: profilePic upload happens when Save Basic Profile is clicked
  ---------------------------------------- */
  const handleSaveBasic = async () => {
    if (!authUser) return;

    if (!name.trim()) {
      return toast.error("Name cannot be empty");
    }

    setSavingBasic(true);
    toast.loading("Saving profile...", { id: "save-basic" });

    try {
      let uploadedUrl: string | null = null;

      // 1) Upload profile pic first if selected
      if (profilePicFile) {
        uploadedUrl = await uploadProfilePic();
        if (uploadedUrl) {
          setProfilePicUrl(uploadedUrl);
          // also update local staffDoc for immediate UI reflect
          setStaffDoc((p) => ({
            ...(p || {}),
            profilePic: uploadedUrl,
          }));
        } else {
          // if upload failed, stop saving
          throw new Error("Profile picture upload failed");
        }
      }

      // 2) Call update-basic API to save name (and send profilePic if available)
      const token = await authUser.getIdToken();
      const res = await fetch("/api/staff/profile/update-basic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          ...(uploadedUrl ? { profilePic: uploadedUrl } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Failed to update profile");
      }

      toast.success("Profile updated ✅", { id: "save-basic" });

      // update local UI state
      setStaffDoc((p) => ({
        ...(p || {}),
        name: name.trim(),
        profilePic: uploadedUrl || p?.profilePic,
      }));
      setProfilePicFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to update profile", {
        id: "save-basic",
      });
    } finally {
      setSavingBasic(false);
    }
  };

  /* ---------------------------------------
     ✅ AADHAAR SAVE (SAFE: last4 + image)
  ---------------------------------------- */
  const handleSaveAadhaar = async () => {
    if (!authUser) return;

    const clean = String(aadhaarNumberInput).replace(/\D/g, "");
    if (clean.length < 4) {
      return toast.error("Please enter a valid Aadhaar number");
    }
    const last4 = clean.slice(-4);

    setSavingAadhaar(true);
    try {
      const token = await authUser.getIdToken();

      const formData = new FormData();
      formData.append("last4", last4);
      if (aadhaarImageFile) formData.append("aadhaarImage", aadhaarImageFile);

      const res = await fetch("/api/staff/profile/update-aadhaar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Failed to update Aadhaar");
      }

      toast.success("Aadhaar details submitted ✅");

      // UI update
      setStaffDoc((prev) => ({
        ...(prev || {}),
        aadhaar: {
          ...(prev?.aadhaar || {}),
          last4,
          imageUrl: data.imageUrl || prev?.aadhaar?.imageUrl,
          verified: prev?.aadhaar?.verified || false,
        },
      }));
      setAadhaarNumberInput("");
      setAadhaarImageFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to update Aadhaar");
    } finally {
      setSavingAadhaar(false);
    }
  };

  /* ---------------------------------------
     ✅ BANK SAVE (SAFE: last4 only)
  ---------------------------------------- */
  const handleSaveBank = async () => {
    if (!authUser) return;

    if (!bankHolderName.trim()) return toast.error("Account holder name required");
    if (!bankName.trim()) return toast.error("Bank name required");
    if (!bankIfsc.trim()) return toast.error("IFSC required");

    const cleanAcc = bankAccountNumberInput.replace(/\D/g, "");
    if (!cleanAcc || cleanAcc.length < 4) {
      return toast.error("Please enter a valid account number");
    }
    const last4 = cleanAcc.slice(-4);

    setSavingBank(true);
    try {
      const token = await authUser.getIdToken();

      const res = await fetch("/api/staff/profile/update-bank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          holderName: bankHolderName.trim(),
          bankName: bankName.trim(),
          ifsc: bankIfsc.trim().toUpperCase(),
          accountLast4: last4,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Failed to update bank details");
      }

      toast.success("Bank details saved ✅");

      setStaffDoc((prev) => ({
        ...(prev || {}),
        bank: {
          holderName: bankHolderName.trim(),
          bankName: bankName.trim(),
          ifsc: bankIfsc.trim().toUpperCase(),
          last4,
          verified: prev?.bank?.verified || false,
        },
      }));

      setBankAccountNumberInput("");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to update bank details");
    } finally {
      setSavingBank(false);
    }
  };

  /* ---------------------------------------
     ✅ UI LOAD STATE
  ---------------------------------------- */
  if (loadingUser) {
    return (
      <DashboardLayout title="Staff Settings">
        <div className="flex items-center justify-center h-64 text-sm text-gray-500">
          Loading settings...
        </div>
      </DashboardLayout>
    );
  }

  if (!authUser || !staffDoc) return null;

  const email = authUser.email || "";
  const emailVerified = authUser.emailVerified;
  const phone = authUser.phoneNumber || "";
  const phoneVerified = !!phone; // Firebase phone auth is always verified

  return (
    <DashboardLayout
      title="Staff Settings"
      profile={{
        name:
          staffDoc.name ||
          authUser.displayName ||
          authUser.email?.split("@")[0] ||
          "Staff",
        role: "staff",
        profilePic: staffDoc.profilePic || profilePicUrl || undefined,
      }}
    >
      <div className="max-w-3xl mx-auto p-4 space-y-6">

        {/* ✅ BASIC PROFILE */}
        <section className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="text-base font-semibold">Basic Profile</h2>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-xs text-gray-500">
              {profilePicUrl || staffDoc.profilePic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePicUrl || staffDoc.profilePic}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>No photo</span>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setProfilePicFile(file || null);
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setProfilePicUrl(url);
                  }
                }}
                className="text-xs"
              />
              <p className="text-[11px] text-gray-500">
                (Profile pic will upload when you click "Save Basic Profile")
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Full Name
            </label>
            <input
              className="border rounded px-3 py-2 text-sm w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          {/* Verified email & phone */}
          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-medium text-gray-700 mb-1">Email (verified)</div>
              <div className="px-3 py-2 border rounded bg-gray-50 flex items-center justify-between">
                <span className="break-all">{email || "Not set"}</span>
                <span className="ml-2 text-[11px]">
                  {emailVerified ? "✅ Verified" : "❌ Not verified"}
                </span>
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">Mobile (verified)</div>
              <div className="px-3 py-2 border rounded bg-gray-50 flex items-center justify-between">
                <span>{phone || "Not set"}</span>
                <span className="ml-2 text-[11px]">
                  {phoneVerified ? "✅ Verified" : "❌ Not verified"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveBasic}
            disabled={savingBasic}
            className="mt-2 inline-flex items-center px-4 py-2 rounded bg-black text-white text-xs disabled:opacity-60"
          >
            {savingBasic ? "Saving..." : "Save Basic Profile"}
          </button>
        </section>

        {/* ✅ AADHAAR SECTION (SAFE) */}
        <section className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="text-base font-semibold">Aadhaar (KYC)</h2>

          <p className="text-[11px] text-gray-500">
            We do not store your full Aadhaar number. Only last 4 digits and Aadhaar
            image are securely stored for verification.
          </p>

          {/* Existing Aadhaar info */}
          {staffDoc.aadhaar?.last4 && (
            <div className="text-xs bg-gray-50 border rounded px-3 py-2 flex items-center justify-between">
              <span>
                Saved Aadhaar: **** **** **** {staffDoc.aadhaar.last4}
              </span>
              <span className="text-[11px]">
                {staffDoc.aadhaar.verified ? "✅ Verified" : "⏳ Pending"}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Aadhaar Number (will be masked, only last 4 kept)
            </label>
            <input
              className="border rounded px-3 py-2 text-sm w-full"
              value={aadhaarNumberInput}
              onChange={(e) => setAadhaarNumberInput(e.target.value)}
              placeholder="Enter full Aadhaar number"
            />
          </div>

          <div className="space-y-1 text-xs">
            <label className="block text-xs font-medium text-gray-700">
              Aadhaar Card Image (front side)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setAadhaarImageFile(file || null);
              }}
              className="text-xs"
            />
          </div>

          <button
            onClick={handleSaveAadhaar}
            disabled={savingAadhaar}
            className="mt-2 inline-flex items-center px-4 py-2 rounded bg-black text-white text-xs disabled:opacity-60"
          >
            {savingAadhaar ? "Saving..." : "Save Aadhaar Details"}
          </button>
        </section>

        {/* ✅ BANK SECTION */}
        <section className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="text-base font-semibold">Bank Details</h2>

          <p className="text-[11px] text-gray-500">
            Only last 4 digits of your account are stored for identification. Full
            account number is not stored in plain text.
          </p>

          {staffDoc.bank?.last4 && (
            <div className="text-xs bg-gray-50 border rounded px-3 py-2 flex items-center justify-between">
              <span>
                Saved Account: **** **** **** {staffDoc.bank.last4}
              </span>
              <span className="text-[11px]">
                {staffDoc.bank.verified ? "✅ Verified by Admin" : "⏳ Pending verification"}
              </span>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Account Holder Name
              </label>
              <input
                className="border rounded px-3 py-2 text-sm w-full"
                value={bankHolderName}
                onChange={(e) => setBankHolderName(e.target.value)}
                placeholder="As per bank record"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Bank Name
              </label>
              <input
                className="border rounded px-3 py-2 text-sm w-full"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. State Bank of India"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                IFSC Code
              </label>
              <input
                className="border rounded px-3 py-2 text-sm w-full"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                placeholder="e.g. SBIN0001234"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Account Number (full)
              </label>
              <input
                className="border rounded px-3 py-2 text-sm w-full"
                value={bankAccountNumberInput}
                onChange={(e) => setBankAccountNumberInput(e.target.value)}
                placeholder="Will be masked, only last 4 stored"
              />
            </div>
          </div>

          <button
            onClick={handleSaveBank}
            disabled={savingBank}
            className="mt-2 inline-flex items-center px-4 py-2 rounded bg-black text-white text-xs disabled:opacity-60"
          >
            {savingBank ? "Saving..." : "Save Bank Details"}
          </button>
        </section>
      </div>
    </DashboardLayout>
  );
}
