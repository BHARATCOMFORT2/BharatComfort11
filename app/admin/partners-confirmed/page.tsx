"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

type PartnerLead = {
  id: string;
  name: string;
  mobile: string;
  businessName: string;
  city: string;
  businessType: string;
  planType: string;
  status: string;
  createdAt?: any;
};

export default function ConfirmedPartnerLeadsPage() {
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "confirmedPartnerLeads"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data: PartnerLead[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

      setLeads(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-[#0b1220] text-white p-8">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">
        ✅ Confirmed Partner Leads
      </h1>

      {loading && <p className="text-slate-300">Loading leads...</p>}

      {!loading && leads.length === 0 && (
        <p className="text-slate-400">No partner leads yet.</p>
      )}

      {!loading && leads.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-black/50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Mobile</th>
                <th className="p-3 text-left">Business</th>
                <th className="p-3 text-left">City</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Plan</th>
                <th className="p-3 text-left">Status</th>
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
                  <td className="p-3">{lead.businessType}</td>

                  <td className="p-3 font-semibold capitalize">
                    {lead.planType}
                  </td>

                  <td className="p-3 text-green-400 font-semibold">
                    {lead.status}
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
