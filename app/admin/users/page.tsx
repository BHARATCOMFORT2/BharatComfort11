"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const list: any[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setUsers(list);
    } catch (err) {
      console.error("Error fetching users:", err);
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
    fetchUsers();
  }, [router]);

  const removeUser = async (id: string) => {
    try {
      await deleteDoc(doc(db, "users", id));
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      const ref = doc(db, "users", id);
      await updateDoc(ref, { status });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status } : u))
      );
    } catch (err) {
      console.error("Error updating user status:", err);
    }
  };

  if (loading) return <p className="text-center py-12">Loading users...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Manage Users</h1>

      {users.length > 0 ? (
        <table className="w-full border-collapse border rounded-lg overflow-hidden shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Name</th>
              <th className="border px-4 py-2 text-left">Email</th>
              <th className="border px-4 py-2 text-left">Role</th>
              <th className="border px-4 py-2 text-left">Status</th>
              <th className="border px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="bg-white hover:bg-gray-50">
                <td className="border px-4 py-2">{user.name}</td>
                <td className="border px-4 py-2">{user.email}</td>
                <td className="border px-4 py-2">{user.role || "user"}</td>
                <td className="border px-4 py-2">
                  <select
                    value={user.status || "active"}
                    onChange={(e) => changeStatus(user.id, e.target.value)}
                    className="border px-2 py-1 rounded"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
                <td className="border px-4 py-2 text-center">
                  <button
                    onClick={() => removeUser(user.id)}
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
        <p className="text-gray-500">No users found.</p>
      )}
    </div>
  );
}
