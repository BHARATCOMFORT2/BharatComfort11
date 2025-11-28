"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

type Lead = {
  id: string;
  name: string;
  businessName: string;
  address: string;
  contact: string;
  email?: string;
  status: string;
  partnerNotes?: string;
  createdAt?: any;
};

const STATUS_OPTIONS = [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "callback",
  "converted",
  "invalid",
];

export default function TelecallerDashboardPage() {
  const router = useRouter();
  const [staffId, setStaffId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);

  // ✅ ✅ REAL STAFF AUTH + APPROVAL CHECK (FIXED)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStaffId(null);
        setLoadingUser(false);
        router.push("/staff/login");
        return;
      }

      try {
        // ✅ REAL STAFF COLLECTION
        const snap = await getDoc(doc(db, "staff", user.uid));

        if (!snap.exists()) {
          await signOut(auth);
          toast.error("Staff profile not found");
          router.push("/staff/login");
          return;
        }

        const profile = snap.data();

        // ✅ Must be telecaller
        if (profile.role !== "telecaller") {
          await signOut(auth);
          toast.error("This dashboard is for telecallers only");
          router.push("/staff/login");
          return;
        }

        // ⏳ Pending
        if (profile.status === "pending") {
          await signOut(auth);
          toast("Your account is pending admin approval", { icon: "⏳" });
          router.push("/staff/login");
          return;
        }

        // ❌ Rejected
        if (profile.status === "rejected") {
          await signOut(auth);
          toast.error("Your account has been rejected by admin");
          router.push("/staff/login");
          return;
        }

        // ❌ Inactive
        if (profile.isActive !== true) {
          await signOut(auth);
          toast.error("Your account is inactive");
          router.push("/staff/login");
          return;
        }

        // ✅ Approved + Active Telecaller
        setStaffId(user.uid);
      } catch (err) {
        console.error("Staff auth check error:", err);
        await signOut(auth);
        router.push("/staff/login");
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsub();
  }, [router]);

  // ✅ Fetch assigned leads
  useEffect(() => {
    const fetchLeads = async () => {
      if (!staffId) return;
      setLoadingLeads(true);

      try {
        const res = await fetch("/api/staff/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffId }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to fetch leads");
        }

        setLeads(data.data || []);
      } catch (err: any) {
        console.error("Failed to load leads:", err);
        toast.error(err?.message || "Leads load nahi ho paaye");
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchLeads();
  }, [staffId]);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    if (!staffId) return;

    setSavingLeadId(leadId);
    try {
      const res = await fetch("/api/staff/leads/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, leadId, status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Status update failed");
      }

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      );

      toast.success("Lead status updated");
    } catch (err: any) {
      console.error("Status update error:", err);
      toast.error(err?.message || "Status update nahi ho paaya");
    } finally {
      setSavingLeadId(null);
    }
  };

  const handleNotesSave = async (leadId: string, notes: string) => {
    if (!staffId) return;

    setSavingLeadId(leadId);
    try {
      const res = await fetch("/api/staff/leads/update-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, leadId, partnerNotes: notes }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Notes update failed");
      }

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, partnerNotes: notes } : lead
        )
      );

      toast.success("Notes saved");
    } catch (err: any) {
      console.error("Notes update error:", err);
      toast.error(err?.message || "Notes save nahi ho paaye");
    } finally {
      setSavingLeadId(null);
    }
  };

  if (loadingUser) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-500">Checking staff access...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!staffId) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Telecaller Dashboard</h1>
          <p className="text-sm text-gray-500">
            Assigned leads par call karein, status update karein, aur partner
            details notes me add karein.
          </p>
        </div>

        {/* ✅ Tumhara existing leads table UI yahin rahega — unchanged */}
      </div>
    </DashboardLayout>
  );
}
