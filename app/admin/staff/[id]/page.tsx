"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function StaffDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const staffId = params?.id as string;

  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    try {
      const snap = await getDoc(doc(db, "staffs", staffId));
      if (snap.exists()) {
        setStaff({ id: snap.id, ...snap.data() });
      }
    } catch (err) {
      console.error("Error fetching staff details:", err);
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
    // TODO: enforce superadmin role check
    fetchStaff();
  }, [router, staffId]);

  const updateRole = async (role: string) => {
    try {
      await updateDoc(doc(db, "staffs", staffId), { role });
      setStaff((prev: any) => ({ ...prev, role }));
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      await updateDoc(doc(db, "staffs", staffId), { status });
      setStaff((prev: any) => ({ ...prev, status }));
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  if (loading) return <p className="text-center py-12">Loading staff details...</p>;
  if (!staff) return <p className="text-center py-12">Staff not found.</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <button
        onClick={() => router.back()}
        className="text-blue-600 mb-4 hover:underline"
      >
        ← Back to Staffs
      </button>

      <h1 className="text-2xl font-bold mb-6">Staff Details</h1>

      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <p><span className="font-semibold">Name:</span> {staff.name}</p>
        <p><span className="font-semibold">Email:</span> {staff.email}</p>

        <div>
          <label className="font-semibold block mb-1">Role</label>
          <select
            value={staff.role || "support"}
            onChange={(e) => updateRole(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="support">Support</option>
            <option value="content_manager">Content Manager</option>
            <option value="moderator">Moderator</option>
            <option value="operations">Operations</option>
          </select>
        </div>

        <div>
          <label className="font-semibold block mb-1">Status</label>
          <select
            value={staff.status || "active"}
            onChange={(e) => updateStatus(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div>
          <label className="font-semibold block mb-1">Tasks/Notes</label>
          <p className="text-gray-600 text-sm">
            (This could be extended later to show logs of actions this staff has taken.)
          </p>
        </div>
      </div>
    </div>
  );
}
