"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function StaffSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const Item = ({
    href,
    label,
  }: {
    href: string;
    label: string;
  }) => (
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

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    router.push("/login");
  };

  return (
    <aside className="w-[240px] min-h-screen border-r bg-white p-4 space-y-2">
      {/* HEADER */}
      <div className="mb-4">
        <div className="text-lg font-semibold">Staff Panel</div>
        <div className="text-xs text-gray-500">
          Telecaller Dashboard
        </div>
      </div>

      {/* MENU */}
      <nav className="space-y-1">
        <Item href="/staff/dashboard" label="📊 Dashboard" />
        <Item href="/staff/dashboard" label="📞 Leads / Tasks" />
        <Item
          href="/staff/InterestedPartners"
          label="⭐ Interested Partners"
        />
        <Item
          href="/staff/CallbackLeads"
          label="⏰ Callbacks"
        />
        <Item
          href="/staff/performance"
          label="📈 Performance"
        />
        <Item href="/staff/earnings" label="💰 Earnings" />
        <Item href="/staff/settings" label="⚙️ Settings" />
      </nav>

      {/* FOOTER */}
      <div className="pt-4 mt-6 border-t">
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
