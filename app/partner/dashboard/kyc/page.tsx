"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

/**
 * Simple Partner KYC page
 * - Aadhaar (required)
 * - GST (optional)
 * - Phone (editable)
 * - Business Name (required)
 * - Address (Line1, Line2, City, State, Pincode)
 * - File uploads: aadhaarFile (required), gstFile (optional)
 *
 * Uses:
 * - POST /api/partners/kyc/upload  -> returns { success, storagePath }
 * - POST /api/partners/kyc/submit  -> accepts token, idType, idNumberMasked, documents[]
 *
 * After submit -> redirect to /partner/dashboard/kyc/pending
 */

export default function PartnerKYCPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Form fields
  const [aadhaar, setAadhaar] = useState("");
  const [gst, setGst] = useState(""); // optional
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

  // Existing partner data (pre-fill)
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

      // fetch partner profile (if exists) to prefill
      try {
        const res = await fetch("/api/partners/profile", {
          credentials: "include",
        });
        const j = await res.json().catch(() => null);
        if (j?.ok && j.partner) {
          const p = j.partner;
          setPartnerProfile(p);

          // prefill common fields if available
          if (p.phone) setPhone(p.phone);
          if (p.businessName) setBusinessName(p.businessName);
          if (p.address) {
            setAddrLine1(p.address.line1 || "");
            setAddrLine2(p.address.line2 || "");
            setCity(p.address.city || "");
            setStateField(p.address.state || "");
            setPincode(p.address.pincode || "");
          }
          if (p.kycStatus && p.kycStatus.toUpperCase() === "APPROVED") {
            // already approved — send them to dashboard
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

  // Helper: basic local validation for aadhaar
  const validAadhaar = (s: string) =>
    !!s && /^\d{4}\s?\d{4}\s?\d{4}$/.test(s.replace(/\D/g, "").padStart(12, "0"));

  // Upload helper
  async function uploadFile(file: File, docType: string) {
    if (!file) throw new Error("No file provided");
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
    try {
      if (!user || !token) {
        toast.error("Not signed in");
        return;
      }

      // Validation
      if (!aadhaar.trim()) {
        toast.error("Aadhaar number is required");
        return;
      }
      // basic Aadhaar format check (loose)
      const aadNum = aadhaar.replace(/\s+/g, "");
      if (!/^\d{12}$/.test(aadNum)) {
        toast.error("Enter a valid 12-digit Aadhaar number");
        return;
      }

      if (!businessName.trim()) {
        toast.error("Business name is required");
        return;
      }

      if (!addrLine1.trim() || !city.trim() || !stateField.trim() || !pincode.trim()) {
        toast.error("Please fill full business address (line1, city, state, pincode)");
        return;
      }

      // Aadhaar file required
      if (!aadhaarFile) {
        toast.error("Please upload Aadhaar file (image or PDF)");
        return;
      }

      setSubmitting(true);

      // 1) Upload Aadhaar file
      const aadhaarStoragePath = await uploadFile(aadhaarFile, "aadhaar_file");

      // 2) Upload GST file if provided
      let gstStoragePath = null;
      if (gstFile) {
        gstStoragePath = await uploadFile(gstFile, "gst_file");
      }

      // 3) Build address object
      const address = {
        line1: addrLine1.trim(),
        line2: addrLine2.trim() || "",
        city: city.trim(),
        state: stateField.trim(),
        pincode: pincode.trim(),
      };

      // 4) Update partner profile (lightweight) and submit KYC
      // First update partner main doc with business details (best-effort)
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

      // 5) Prepare documents[] for KYC submit
      const documents: any[] = [
        { docType: "aadhaar_file", storagePath: aadhaarStoragePath },
      ];
      if (gstStoragePath) {
        documents.push({ docType: "gst_file", storagePath: gstStoragePath });
      }

      // 6) Submit KYC (POST)
      const submitRes = await fetch("/api/partners/kyc/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          idType: "AADHAAR",
          idNumberMasked: `${aadNum.slice(0,4)}XXXX${aadNum.slice(-4)}`, // masked
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

      toast.success("KYC submitted. Admin will review and notify you.");
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
          Please fill basic business details and upload Aadhaar (GST optional).
        </p>

        <div className="grid gap-4">
          {/* Aadhaar */}
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

          {/* Aadhaar file */}
          <div>
            <label className="block text-sm font-medium">Aadhaar File (image/pdf) *</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
            {partnerProfile?.kyc?.documents?.find((d:any)=>d.docType==="aadhaar_file") && (
              <div className="text-sm text-gray-600 mt-1">
                Existing Aadhaar file available
              </div>
            )}
          </div>

          {/* GST */}
          <div>
            <label className="block text-sm font-medium">GST Number (optional)</label>
            <input
              value={gst}
              onChange={(e) => setGst(e.target.value)}
              placeholder="12ABCDE1234F1Z5"
              className="mt-1 w-full border rounded p-2"
            />
          </div>

          {/* GST file optional */}
          <div>
            <label className="block text-sm font-medium">GST File (optional)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setGstFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
            {partnerProfile?.kyc?.documents?.find((d:any)=>d.docType==="gst_file") && (
              <div className="text-sm text-gray-600 mt-1">
                Existing GST file available
              </div>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium">Phone Number *</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="mt-1 w-full border rounded p-2"
            />
          </div>

          {/* Business name */}
          <div>
            <label className="block text-sm font-medium">Business Registered Name *</label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your Business Name"
              className="mt-1 w-full border rounded p-2"
            />
          </div>

          {/* Address: full form */}
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
            <div>
              <label className="block text-sm font-medium">City *</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full border rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">State *</label>
              <input
                value={stateField}
                onChange={(e) => setStateField(e.target.value)}
                className="mt-1 w-full border rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Pincode *</label>
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="mt-1 w-full border rounded p-2"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded"
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
