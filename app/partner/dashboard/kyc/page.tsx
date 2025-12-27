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

  /* ----------------------------------------------------
     Load user + partner profile
  ---------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/auth/login");
        return;
      }

      if (!mounted) return;

      setUser(u);
      const t = await u.getIdToken(true);
      setToken(t);

      try {
        const res = await fetch("/api/partners/profile", {
          credentials: "include",
        });
        const j = await res.json();

        if (j?.partner) {
          const p = j.partner;

          if (p.phone) setPhone(p.phone);
          if (p.businessName) setBusinessName(p.businessName);

          if (p.address) {
            setAddrLine1(p.address.line1 || "");
            setAddrLine2(p.address.line2 || "");
            setCity(p.address.city || "");
            setStateField(p.address.state || "");
            setPincode(p.address.pincode || "");
          }

          const kyc = String(
            p.kycStatus || p.kyc?.status || "NOT_STARTED"
          ).toUpperCase();

          if (kyc === "APPROVED") {
            router.replace("/partner/dashboard");
            return;
          }

          if (kyc === "UNDER_REVIEW") {
            router.replace("/partner/dashboard/kyc/pending");
            return;
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [router]);

  /* ----------------------------------------------------
     Upload helper (JSON + BASE64)
  ---------------------------------------------------- */
  async function uploadFile(file: File, docType: string) {
    if (!token) throw new Error("Not authenticated");

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch("/api/partners/kyc/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        docType,
        fileBase64: base64,
      }),
    });

    const j = await res.json();

    if (!res.ok || !j?.success) {
      throw new Error(j?.error || "Upload failed");
    }

    return j.storagePath as string;
  }

  /* ----------------------------------------------------
     Submit KYC
  ---------------------------------------------------- */
  const handleSubmit = async () => {
    if (submitting) return;

    try {
      if (!token) {
        toast.error("Not signed in");
        return;
      }

      const aadNum = aadhaar.replace(/\D/g, "");
      if (!/^\d{12}$/.test(aadNum)) {
        toast.error("Enter valid Aadhaar number");
        return;
      }

      if (!businessName.trim()) {
        toast.error("Business name required");
        return;
      }

      if (
        !addrLine1.trim() ||
        !city.trim() ||
        !stateField.trim() ||
        !pincode.trim()
      ) {
        toast.error("Complete address required");
        return;
      }

      if (!aadhaarFile) {
        toast.error("Aadhaar file required");
        return;
      }

      setSubmitting(true);

      // Upload documents
      const aadhaarPath = await uploadFile(aadhaarFile, "AADHAAR");

      let gstPath: string | null = null;
      if (gstFile) {
        gstPath = await uploadFile(gstFile, "GST");
      }

      const documents = [
        { docType: "AADHAAR", storagePath: aadhaarPath },
      ];

      if (gstPath) {
        documents.push({ docType: "GST", storagePath: gstPath });
      }

      const maskedAadhaar = `XXXXXXXX${aadNum.slice(-4)}`;

      const res = await fetch("/api/partners/kyc/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          idType: "AADHAAR",
          idNumberMasked: maskedAadhaar,
          documents,
          meta: {
            businessName: businessName.trim(),
            phone: phone.trim(),
            gstNumber: gst.trim() || null,
            address: {
              line1: addrLine1.trim(),
              line2: addrLine2.trim() || "",
              city: city.trim(),
              state: stateField.trim(),
              pincode: pincode.trim(),
            },
          },
        }),
      });

      const j = await res.json();

      if (!res.ok || !j?.success) {
        throw new Error(j?.error || "KYC submit failed");
      }

      toast.success("✅ KYC submitted");
      router.replace("/partner/dashboard/kyc/pending");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "KYC failed");
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

        <div className="grid gap-4">
          <input
            placeholder="Aadhaar Number"
            value={aadhaar}
            onChange={(e) => setAadhaar(e.target.value)}
            className="border p-2 rounded"
          />

          <input type="file" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />

          <input
            placeholder="GST (optional)"
            value={gst}
            onChange={(e) => setGst(e.target.value)}
            className="border p-2 rounded"
          />

          <input type="file" onChange={(e) => setGstFile(e.target.files?.[0] || null)} />

          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border p-2 rounded"
          />

          <input
            placeholder="Business Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="border p-2 rounded"
          />

          <input placeholder="Address Line 1" value={addrLine1} onChange={(e) => setAddrLine1(e.target.value)} className="border p-2 rounded" />
          <input placeholder="Address Line 2" value={addrLine2} onChange={(e) => setAddrLine2(e.target.value)} className="border p-2 rounded" />

          <div className="grid grid-cols-3 gap-3">
            <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="border p-2 rounded" />
            <input placeholder="State" value={stateField} onChange={(e) => setStateField(e.target.value)} className="border p-2 rounded" />
            <input placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} className="border p-2 rounded" />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 text-white py-2 rounded"
          >
            {submitting ? "Submitting…" : "Submit KYC"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
