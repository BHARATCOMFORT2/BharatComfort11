// app/admin/dashboard/approvals/page.tsx
"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { getIdToken } from "firebase/auth";

type PendingItem = {
  id: string;
  type: "partner" | "story" | "review";
  name?: string;
  email?: string;
  title?: string;
  content?: string;
  status?: string;
  createdAt?: any;
};

export default function AdminApprovalsPage() {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubList: any[] = [];

    // Pending partners
    const qPartners = query(
      collection(db, "partners"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    unsubList.push(
      onSnapshot(qPartners, (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          type: "partner" as const,
          name: (d.data() as any).name,
          email: (d.data() as any).email,
          status: (d.data() as any).status,
          createdAt: (d.data() as any).createdAt,
        }));
        setPendingItems((prev) => {
          const others = prev.filter((p) => p.type !== "partner");
          return [...others, ...list];
        });
      })
    );

    // Pending stories
    const qStories = query(
      collection(db, "stories"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    unsubList.push(
      onSnapshot(qStories, (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          type: "story" as const,
          title: (d.data() as any).title,
          name: (d.data() as any).authorName,
          status: (d.data() as any).status,
          createdAt: (d.data() as any).createdAt,
        }));
        setPendingItems((prev) => {
          const others = prev.filter((p) => p.type !== "story");
          return [...others, ...list];
        });
      })
    );

    // Pending reviews
    const qReviews = query(
      collection(db, "reviews"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    unsubList.push(
      onSnapshot(qReviews, (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          type: "review" as const,
          name: (d.data() as any).userName,
          content: (d.data() as any).comment,
          status: (d.data() as any).status,
          createdAt: (d.data() as any).createdAt,
        }));
        setPendingItems((prev) => {
          const others = prev.filter((p) => p.type !== "review");
          return [...others, ...list];
        });
      })
    );

    setLoading(false);

    return () => unsubList.forEach((unsub) => unsub());
  }, []);

  const handleAction = async (
    id: string,
    type: "partner" | "story" | "review",
    action: "approve" | "reject"
  ) => {
    try {
      const user = auth.currentUser;
      if (!user) return alert("Admin not authenticated.");
      const token = await getIdToken(user, true);

      const endpoint =
        type === "partner"
          ? "/api/admin/partners/approve"
          : type === "story"
          ? "/api/stories/approve"
          : "/api/reviews/approve";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Action failed");
      }
      alert(`${type} ${action}d successfully.`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Action failed");
    }
  };

  return (
    <DashboardLayout title="Admin • Pending Approvals">
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            Pending Approvals
          </h2>
          <span className="text-sm text-gray-500">
            Total: {pendingItems.length}
          </span>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-12">
            Loading pending items…
          </p>
        ) : pendingItems.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No pending approvals found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Name / Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingItems.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 capitalize text-gray-800">
                      {item.type}
                    </td>
                    <td className="px-4 py-3">
                      {item.title || item.name || item.content?.slice(0, 40) || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleAction(item.id, item.type, "approve")}
                        className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(item.id, item.type, "reject")}
                        className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
