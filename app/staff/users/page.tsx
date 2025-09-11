"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function StaffUsersPage() {
  const router = useRouter();
  const [staffs, setStaffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaffs = async () => {
    try {
      const snap = await getDocs(collection(db, "staffs"));
      const list: any[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setStaffs(list);
    } catch (err) {
      console.error("Error fetching staff users:", err);
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
    // Ideally: check if user is superadmin
    fetchStaffs();
  }, [router]);

  const removeStaff = async (id: string) => {
    try {
      await deleteDoc(doc(db, "staffs", id));
      setStaffs((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Error removing staff:", err);
    }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      const ref = doc(db, "staffs", id);
      await updateDoc(ref, { role });
      setStaffs((prev) =>
        prev.map((s) => (s.id === id ? { ...s, role } : s))
      );
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  if (loading) return <p className="text-center py-12">Loading staff users...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Manage Staff Users</h1>

      {staffs.length > 0 ? (
        <table className="w-full border-collapse border rounded-lg overflow-hidden shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Name</th>
              <th className="border px-4 py-2 text-left">Email</th>
              <th className="border px-4 py-2 text-left">Role</th>
              <th className="border px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffs.map((staff) => (
              <tr key={staff.id} className="bg-white hover:bg-gray-50">
                <td className="border px-4 py-2">{staff.name}</td>
                <td className="border px-4 py-2">{staff.email}</td>
                <td className="border px-4 py-2">
                  <select
                    value={staff.role}
                    onChange={(e) => changeRole(staff.id, e.target.value)}
                    className="border px-2 py-1 rounded"
                  >
                    <option value="Moderator">Moderator</option>
                    <option value="Content Manager">Content Manager</option>
                    <option value="Support">Support</option>
                    <option value="Admin">Admin</option>
                  </select>
                </td>
                <td className="border px-4 py-2 text-center">
                  <button
                    onClick={() => removeStaff(staff.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500">No staff users yet.</p>
      )}
    </div>
  );
}
