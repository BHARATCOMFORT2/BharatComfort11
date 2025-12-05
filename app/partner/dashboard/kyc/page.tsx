"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

export default function PartnerKYCPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Form fields
  const [aadhaar, setAadhaar] = useState("");
  const [gst, setGst] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [pincode, setPincode] = useState("");

  // Files
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);

  const [partnerProfile, setPartnerProfile] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/auth/login");
        return;
      }

      if (!mounted) return;

      setUser(u);
      const t = await u.getIdToken();
      setToken(t);

      try {
        const res = await fetch("/api/partners/profile", {
          credentials: "include",
        });

        const j = await res.json().catch(() => null);

        if (j?.partner) {
          const p = j.partner;
          setPartnerProfile(p);

          if (p.phone) setPhone(p.phone);
          if (p.businessName) setBusinessName(p.businessName);

          if (p.address) {
            setAddrLine1(p.address.line1 || "");
            setAddrLine2(p.address.line2 || "");
            setCity(p.address.city || "");
            setStateField(p.address.state || "");
            setPincode(p.address.pincode || "");
          }

          if (p.kycStatus?.toUpperCase() === "APPROVED") {
            router.push("/partner/dashboard");
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load partner profile", err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [router]);

  // ✅ Upload helper
  async function uploadFile(file: File, docType: string) {
    if (!file) throw new Error("No file selected");
    if (!user || !token) throw new Error("Not authenticated");

    const form = new FormData();
    form.append("partnerId", user.uid);
    form.append("token", token);
    form.append("docType", docType);
    form.append("file", file);

    const res = await fetch("/api/partners/kyc/upload", {
      method: "POST",
      body: form,
    });

    const j = await res.json().catch(() => null);

    if (!res.ok || !j?.success) {
      throw new Error(j?.error || "Upload failed");
    }

    return j.storagePath;
  }

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      if (!user || !token) {
        toast.error("Not signed in");
        return;
      }

      // ✅ Validation
      const aadNum = aadhaar.replace(/\D/g, "");
      if (!/^\d{12}$/.test(aadNum)) {
        toast.error("Enter valid 12-digit Aadhaar number");
        return;
      }

      if (!businessName.trim()) {
        toast.error("Business name is required");
        return;
      }

      if (!addrLine1.trim() || !city.trim() || !stateField.trim() || !pincode.trim()) {
        toast.error("Please fill full business address");
        return;
      }

      if (!aadhaarFile) {
        toast.error("Aadhaar file is required");
        return;
      }

      setSubmitting(true);

      // ✅ Upload docs
      const aadhaarStoragePath = await uploadFile(aadhaarFile, "aadhaar_file");

      let gstStoragePath: string | null = null;
      if (gstFile) {
        gstStoragePath = await uploadFile(gstFile, "gst_file");
      }

      const address = {
        line1: addrLine1.trim(),
        line2: addrLine2.trim() || "",
        city: city.trim(),
        state: stateField.trim(),
        pincode: pincode.trim(),
      };

      // ✅ Update profile (non-blocking)
      try {
        await fetch("/api/partners/profile/update", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName: businessName.trim(),
            phone: phone.trim(),
            address,
          }),
        });
      } catch (err) {
        console.warn("Profile update failed (non-fatal)", err);
      }

      const documents: any[] = [
        { docType: "aadhaar_file", storagePath: aadhaarStoragePath },
      ];
      if (gstStoragePath) {
        documents.push({ docType: "gst_file", storagePath: gstStoragePath });
      }

      // ✅ Mask Aadhaar safely
      const maskedAadhaar = `${aadNum.slice(0, 4)}XXXX${aadNum.slice(-4)}`;

      const submitRes = await fetch("/api/partners/kyc/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          idType: "AADHAAR",
          idNumberMasked: maskedAadhaar,
          documents,
          meta: {
            gstNumber: gst.trim() || null,
            businessName: businessName.trim(),
            phone: phone.trim(),
            address,
          },
        }),
      });

      const submitJson = await submitRes.json().catch(() => null);
      if (!submitRes.ok || !submitJson?.success) {
        throw new Error(submitJson?.error || "KYC submit failed");
      }

      toast.success("KYC submitted. Admin will review.");
      router.push("/partner/dashboard/kyc/pending");
    } catch (err: any) {
      console.error("KYC submit failed:", err);
      toast.error(err?.message || "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Partner KYC">
        <p className="text-center py-10">Loading…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Partner KYC">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold mb-4">Partner KYC</h1>
        <p className="text-gray-600 mb-6">
          Please fill business details and upload Aadhaar (GST optional).
        </p>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium">Aadhaar Number *</label>
            <input
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value)}
              placeholder="123412341234"
              className="mt-1 w-full border rounded p-2"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Aadhaar File *</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">GST Number (optional)</label>
            <input
              value={gst}
              onChange={(e) => setGst(e.target.value)}
              className="mt-1 w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">GST File (optional)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setGstFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Phone *</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Business Name *</label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Address Line 1 *</label>
            <input
              value={addrLine1}
              onChange={(e) => setAddrLine1(e.target.value)}
              className="mt-1 w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Address Line 2</label>
            <input
              value={addrLine2}
              onChange={(e) => setAddrLine2(e.target.value)}
              className="mt-1 w-full border rounded p-2"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              placeholder="State"
              value={stateField}
              onChange={(e) => setStateField(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              placeholder="Pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="border p-2 rounded"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 disabled:opacity-60 text-white rounded"
            >
              {submitting ? "Submitting…" : "Submit KYC"}
            </button>

            <button
              onClick={() => router.push("/partner/dashboard")}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
