"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
export default function StaffSidebar({
  staff,
}: {
  staff: StaffProfile | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

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

  return (
    <aside className="w-[240px] min-h-screen border-r bg-white flex flex-col">
      {/* STAFF PROFILE */}
      <div className="p-4 border-b flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {staff?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={staff.photoURL}
              alt="Staff"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-600">
              {staff?.name?.charAt(0) || "S"}
            </span>
          )}
        </div>

        <div>
          <div className="text-sm font-semibold">
            {staff?.name || "Staff"}
          </div>
          <div className="text-xs text-gray-500">
            {staff?.role || "Staff"}
          </div>
        </div>
      </div>

      {/* MENU */}
      <nav className="flex-1 p-3 space-y-1">
        <Item href="/staff/dashboard" label="📊 Dashboard" />
        <Item href="/staff/dashboard" label="📞 Leads / Tasks" />
        <Item href="/staff/InterestedPartners" label="⭐ Interested Partners" />
        <Item href="/staff/CallbackLeads" label="⏰ Callbacks" />
        <Item href="/staff/performance" label="📈 Performance" />
        <Item href="/staff/earnings" label="💰 Earnings" />
        <Item href="/staff/settings" label="⚙️ Settings" />

        <div className="mt-4 border-t pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            TASK RANGE
          </p>

          <Item href="/staff/dashboard?range=today" label="Today" />
          <Item href="/staff/dashboard?range=yesterday" label="Yesterday" />
          <Item href="/staff/dashboard?range=week" label="This Week" />
          <Item href="/staff/dashboard?range=month" label="This Month" />
          <Item href="/staff/dashboard?range=last_month" label="Last Month" />
          <Item href="/staff/dashboard?range=all" label="Total Leads" />
        </div>
      </nav>

      {/* LOGOUT */}
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
