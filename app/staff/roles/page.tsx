"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function StaffRolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<any[]>([]);
  const [newRole, setNewRole] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    try {
      const snap = await getDocs(collection(db, "roles"));
      const rolesList: any[] = [];
      snap.forEach((doc) => rolesList.push({ id: doc.id, ...doc.data() }));
      setRoles(rolesList);
    } catch (err) {
      console.error("Error fetching roles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Ideally, check here if user is superadmin
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    fetchRoles();
  }, [router]);

  const createRole = async () => {
    if (!newRole.trim()) return;

    try {
      await addDoc(collection(db, "roles"), {
        name: newRole.trim(),
        createdAt: Date.now(),
      });
      setNewRole("");
      fetchRoles();
    } catch (err) {
      console.error("Error creating role:", err);
    }
  };

  const deleteRole = async (id: string) => {
    try {
      await deleteDoc(doc(db, "roles", id));
      setRoles((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Error deleting role:", err);
    }
  };

  if (loading) return <p className="text-center py-12">Loading roles...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Manage Staff Roles</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Enter role name..."
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="border px-3 py-2 rounded-lg flex-1"
        />
        <button
          onClick={createRole}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Add Role
        </button>
      </div>

      {roles.length > 0 ? (
        <ul className="space-y-3">
          {roles.map((role) => (
            <li
              key={role.id}
              className="flex justify-between items-center border rounded-lg px-4 py-2 bg-white shadow"
            >
              <span>{role.name}</span>
              <button
                onClick={() => deleteRole(role.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No roles defined yet.</p>
      )}
    </div>
  );
}
