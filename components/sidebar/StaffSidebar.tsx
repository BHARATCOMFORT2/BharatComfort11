"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase-client";

/* ---------------------------------------
   TYPES
---------------------------------------- */
type StaffProfile = {
  name?: string;
  photoURL?: string;
  role?: string;
};

/* ---------------------------------------
   COMPONENT
---------------------------------------- */
export default function StaffSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [staff, setStaff] = useState<StaffProfile>({
    name: "",
    photoURL: "",
    role: "Staff",
  });

  /* ---------------------------------------
     LOAD STAFF PROFILE
  ---------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const snap = await getDoc(doc(db, "staff", user.uid));
        if (!snap.exists()) return;

        const data = snap.data();
        setStaff({
          name: data?.name || user.displayName || "Staff",
          photoURL: data?.photoURL || "",
          role: data?.role || "Staff",
        });
      } catch (err) {
        console.error("Sidebar staff load error", err);
      }
    });

    return () => unsub();
  }, []);

  /* ---------------------------------------
     HELPERS
  ---------------------------------------- */
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    router.push("/staff/login");
  };

  const Item = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      className={`block px-4 py-2 rounded text-sm transition ${
        isActive(href)
          ? "bg-black text-white"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </Link>
  );

  /* ---------------------------------------
     UI
  ---------------------------------------- */
  return (
    <aside className="w-[240px] min-h-screen border-r bg-white flex flex-col">
      {/* ================= STAFF PROFILE ================= */}
      <div className="p-4 border-b flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {staff.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={staff.photoURL}
              alt="Staff"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-600">
              {staff.name?.charAt(0) || "S"}
            </span>
          )}
        </div>

        <div>
          <div className="text-sm font-semibold">
            {staff.name}
          </div>
          <div className="text-xs text-gray-500">
            {staff.role}
          </div>
        </div>
      </div>

      {/* ================= MAIN MENU ================= */}
      <nav className="flex-1 p-3 space-y-1">
        <Item href="/staff/dashboard" label="📊 Dashboard" />
        <Item href="/staff/dashboard" label="📞 Leads / Tasks" />
        <Item href="/staff/InterestedPartners" label="⭐ Interested Partners" />
        <Item href="/staff/CallbackLeads" label="⏰ Callbacks" />
        <Item href="/staff/performance" label="📈 Performance" />
        <Item href="/staff/earnings" label="💰 Earnings" />
        <Item href="/staff/settings" label="⚙️ Settings" />

        {/* ================= TASK / LEADS SECTION ================= */}
        <div className="mt-4 border-t pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            TASK RANGE
          </p>

          <Link
            href="/staff/dashboard?range=today"
            className="block px-4 py-2 rounded text-sm hover:bg-gray-100 text-gray-700"
          >
            Today
          </Link>

          <Link
            href="/staff/dashboard?range=yesterday"
            className="block px-4 py-2 rounded text-sm hover:bg-gray-100 text-gray-700"
          >
            Yesterday
          </Link>

          <Link
            href="/staff/dashboard?range=week"
            className="block px-4 py-2 rounded text-sm hover:bg-gray-100 text-gray-700"
          >
            This Week
          </Link>

          <Link
            href="/staff/dashboard?range=month"
            className="block px-4 py-2 rounded text-sm hover:bg-gray-100 text-gray-700"
          >
            This Month
          </Link>

          <Link
            href="/staff/dashboard?range=last_month"
            className="block px-4 py-2 rounded text-sm hover:bg-gray-100 text-gray-700"
          >
            Last Month
          </Link>

          <Link
            href="/staff/dashboard?range=all"
            className="block px-4 py-2 rounded text-sm hover:bg-gray-100 text-gray-700"
          >
            Total Leads
          </Link>
        </div>
      </nav>

      {/* ================= LOGOUT ================= */}
      <div className="p-3 border-t">
        <button
          onClick={logout}
          className="w-full text-left px-4 py-2 text-sm rounded text-red-600 hover:bg-red-50"
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
