"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client"; // ✅ SAME PROJECT AS RULES
import {
  collection,
  onSnapshot,
  query,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

type PartnerLead = {
  id: string;
  name: string;
  mobile: string;
  businessName: string;
  city: string;
  businessType?: string;
  planType: string;
  status: string; // new | called | followup | converted | rejected
  followUpDate?: string;
  createdAt?: any;
};

export default function PartnerLeadsAdminPage() {
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      // ✅ ✅ ✅ NOW READING FROM partnerLeads (CORRECT COLLECTION)
      const q = query(collection(db, "partnerLeads"));

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const data: PartnerLead[] = snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as any),
          }));

          setLeads(data);
          setLoading(false);
        },
        (err) => {
          console.error("Firestore error:", err);
          setError("Firestore permission or index error");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Listener init failed:", err);
      setError("Listener failed to initialize");
      setLoading(false);
    }
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      const ref = doc(db, "partnerLeads", id); // ✅ FIXED
      await updateDoc(ref, {
        status,
        lastUpdatedAt: serverTimestamp(),
      });
    } catch (err) {
      alert("Status update failed");
      console.error(err);
    }
  }

  async function updateFollowUp(id: string, followUpDate: string) {
    try {
      const ref = doc(db, "partnerLeads", id); // ✅ FIXED
      await updateDoc(ref, {
        followUpDate,
        status: "followup",
        lastUpdatedAt: serverTimestamp(),
      });
    } catch (err) {
      alert("Follow-up update failed");
      console.error(err);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b1220] text-white p-8">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">
        ✅ Partner Leads – Admin Action Panel
      </h1>

      {loading && <p className="text-slate-300">Loading leads...</p>}

      {!loading && error && (
        <p className="text-red-400 font-semibold">{error}</p>
      )}

      {!loading && !error && leads.length === 0 && (
        <p className="text-slate-400">No partner leads yet.</p>
      )}

      {!loading && !error && leads.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-black/50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Mobile</th>
                <th className="p-3 text-left">Business</th>
                <th className="p-3 text-left">City</th>
                <th className="p-3 text-left">Plan</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Follow-up</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-t border-white/10 hover:bg-white/5 transition"
                >
                  <td className="p-3">{lead.name}</td>

                  <td className="p-3">
                    <a
                      href={`tel:${lead.mobile}`}
                      className="text-yellow-300 hover:underline"
                    >
                      {lead.mobile}
                    </a>
                  </td>

                  <td className="p-3">{lead.businessName}</td>
                  <td className="p-3">{lead.city}</td>
                  <td className="p-3 capitalize font-semibold">
                    {lead.planType}
                  </td>

                  <td className="p-3 font-semibold">
                    {lead.status === "new" && (
                      <span className="text-blue-400">New</span>
                    )}
                    {lead.status === "called" && (
                      <span className="text-yellow-300">Called</span>
                    )}
                    {lead.status === "followup" && (
                      <span className="text-orange-300">Follow-up</span>
                    )}
                    {lead.status === "converted" && (
                      <span className="text-green-400">Converted</span>
                    )}
                    {lead.status === "rejected" && (
                      <span className="text-red-400">Rejected</span>
                    )}
                  </td>

                  <td className="p-3">
                    <input
                      type="date"
                      defaultValue={lead.followUpDate || ""}
                      onChange={(e) =>
                        updateFollowUp(lead.id, e.target.value)
                      }
                      className="bg-black/30 border border-white/10 text-white p-1 rounded"
                    />
                  </td>

                  <td className="p-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => updateStatus(lead.id, "called")}
                      className="px-3 py-1 text-xs rounded bg-yellow-400 text-black"
                    >
                      Call Done
                    </button>

                    <button
                      onClick={() => updateStatus(lead.id, "converted")}
                      className="px-3 py-1 text-xs rounded bg-green-500 text-black"
                    >
                      Converted
                    </button>

                    <button
                      onClick={() => updateStatus(lead.id, "rejected")}
                      className="px-3 py-1 text-xs rounded bg-red-500 text-white"
                    >
                      Rejected
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
