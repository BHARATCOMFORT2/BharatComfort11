"use client";

import { ReactNode, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, LogOut, Briefcase } from "lucide-react";
import { auth } from "@/lib/firebase-client";

interface Props {
  title: string;
  children: ReactNode;
  profile?: any;
}

export default function AdminDashboardLayout({
  title,
  children,
  profile,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/auth/login");
  };

  // 🔥 ADMIN SIDEBAR LINKS
  const adminLinks = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Users", path: "/admin/dashboard/users" },
    { name: "Partners", path: "/admin/dashboard/partners" },
    { name: "Listings", path: "/admin/dashboard/homepage" },
    { name: "KYC", path: "/admin/dashboard/kyc" },
    { name: "Settlements", path: "/admin/dashboard/settlements" },
    { name: "Disputes", path: "/admin/dashboard/disputes" },
    { name: "Refunds", path: "/admin/dashboard/refunds" },
    { name: "Approvals", path: "/admin/dashboard/approvals" },
    { name: "Finance", path: "/admin/dashboard/finance" },
    { name: "Finance Anomalies", path: "/admin/dashboard/finance-anomalies" },
    { name: "CMS", path: "/admin/dashboard/cms" },
    { name: "Reports", path: "/admin/dashboard/reports" },
    { name: "Insights", path: "/admin/dashboard/insights" },
    { name: "Risk Insights", path: "/admin/dashboard/risk-insights" },
    { name: "Invoices", path: "/admin/dashboard/invoices" },
    { name: "Logs", path: "/admin/dashboard/logs" },
    // ⭐ NEW HIRING PAGE
    { name: "Hiring", path: "/admin/dashboard/hiring" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-30 transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        <div className="p-6 flex flex-col items-center border-b">
          <h2 className="text-lg font-semibold">
            {profile?.name || "Admin"}
          </h2>
          <p className="text-sm text-gray-500 capitalize">
            {profile?.role || "admin"}
          </p>
        </div>

        <nav className="mt-6 space-y-2 px-4">
          {adminLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => router.push(link.path)}
              className={`block w-full text-left px-4 py-2 rounded-lg transition ${
                pathname === link.path
                  ? "bg-blue-100 text-blue-700 font-semibold"
                  : "hover:bg-blue-50 text-gray-700"
              }`}
            >
              {link.name}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-6 w-full flex justify-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex-1 sm:ml-64">
        {/* Top bar */}
        <header className="flex justify-between items-center bg-white shadow px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="sm:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X /> : <Menu />}
            </button>
            <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
