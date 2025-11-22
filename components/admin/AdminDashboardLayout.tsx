"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  Home,
  Users,
  User,
  Layers,
  ClipboardList,
  FileText,
  ShieldCheck,
  Calendar,
  DollarSign,
  BarChart2,
  Settings,
  Search as SearchIcon,
  Sun,
  Moon,
} from "lucide-react";
import { auth } from "@/lib/firebase-client";

type Props = {
  title?: string;
  children: ReactNode;
  profile?: { name?: string; role?: string; profilePic?: string };
};

type NavItem = { name: string; path: string; icon?: React.ReactNode; section?: string };

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", path: "/admin/dashboard", icon: <Home size={16} /> },
  { name: "Users", path: "/admin/dashboard/users", icon: <Users size={16} />, section: "Core" },
  { name: "Partners", path: "/admin/dashboard/partners", icon: <User size={16} />, section: "Core" },
  { name: "Listings", path: "/admin/dashboard/homepage", icon: <Layers size={16} />, section: "Operations" },
  { name: "KYC", path: "/admin/dashboard/kyc", icon: <ShieldCheck size={16} />, section: "Operations" },
  { name: "Settlements", path: "/admin/dashboard/settlements", icon: <DollarSign size={16} />, section: "Finance" },
  { name: "Disputes", path: "/admin/dashboard/disputes", icon: <ClipboardList size={16} />, section: "Finance" },
  { name: "Refunds", path: "/admin/dashboard/refunds", icon: <FileText size={16} />, section: "Finance" },
  { name: "Approvals", path: "/admin/dashboard/approvals", icon: <ShieldCheck size={16} />, section: "Workflow" },
  { name: "Finance Anomalies", path: "/admin/dashboard/finance-anomalies", icon: <BarChart2 size={16} />, section: "Finance" },
  { name: "CMS", path: "/admin/dashboard/cms", icon: <FileText size={16} />, section: "Content" },
  { name: "Reports", path: "/admin/dashboard/reports", icon: <BarChart2 size={16} />, section: "Analytics" },
  { name: "Insights", path: "/admin/dashboard/insights", icon: <BarChart2 size={16} />, section: "Analytics" },
  { name: "Risk Insights", path: "/admin/dashboard/risk-insights", icon: <BarChart2 size={16} />, section: "Analytics" },
  { name: "Invoices", path: "/admin/dashboard/invoices", icon: <FileText size={16} />, section: "Finance" },
  { name: "Logs", path: "/admin/dashboard/logs", icon: <ClipboardList size={16} />, section: "System" },
  // Hiring — the new item
  { name: "Hiring", path: "/admin/dashboard/hiring", icon: <Calendar size={16} />, section: "Workflow" },
  { name: "Settings", path: "/admin/dashboard/settings", icon: <Settings size={16} />, section: "System" },
];

export default function AdminDashboardLayout({ title = "Admin", children, profile }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // preserve menu state on small screens
    const handleResize = () => {
      if (window.innerWidth >= 640) setMenuOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // initialize theme from localStorage / prefers-color-scheme
    const saved = typeof window !== "undefined" ? localStorage.getItem("bf_theme") : null;
    if (saved === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    } else if (saved === "light") {
      setDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDark(prefersDark);
      if (prefersDark) document.documentElement.classList.add("dark");
    }
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/auth/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const grouped: Record<string, NavItem[]> = {};
  for (const item of NAV_ITEMS) {
    const group = item.section || "General";
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(item);
  }

  const isActive = (p: string) => {
    // exact or prefix match for nested routes
    return pathname === p || pathname?.startsWith(p + "/");
  };

  const toggleTheme = () => {
    const newDark = !dark;
    setDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("bf_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("bf_theme", "light");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 shadow-lg transition-transform duration-200 ${
          menuOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center text-white font-semibold">BC</div>
            <div>
              <div className="text-sm font-semibold">{profile?.name || "BHARATCOMFORT11"}</div>
              <div className="text-xs text-gray-500 dark:text-gray-300">{profile?.role || "admin"}</div>
            </div>
          </div>
        </div>

        <div className="px-3 py-4 overflow-y-auto h-[calc(100vh-160px)]">
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section} className="mb-4">
              <div className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{section}</div>
              <div className="space-y-1">
                {items.map((it) => (
                  <button
                    key={it.path}
                    onClick={() => router.push(it.path)}
                    className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      isActive(it.path)
                        ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-600 pl-2 text-blue-700 dark:text-blue-300 font-semibold"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    <span className="text-gray-500 dark:text-gray-300">{it.icon}</span>
                    <span className="truncate">{it.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                {profile?.profilePic ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.profilePic} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">A</div>
                )}
              </div>
              <div className="text-sm">
                <div className="font-medium">{profile?.name || "Admin"}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{profile?.role || "admin"}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Toggle theme"
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <button
                onClick={handleLogout}
                className="p-2 rounded-md hover:bg-red-50 text-red-600 dark:text-red-400"
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-h-screen sm:ml-64">
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMenuOpen((s) => !s)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 sm:hidden"
                aria-label="Toggle menu"
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <div>
                <h1 className="text-lg font-semibold">{title}</h1>
                <div className="text-xs text-gray-500 dark:text-gray-400">{/* breadcrumb placeholder */}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  placeholder="Search admin..."
                  className="pl-9 pr-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-700 text-sm placeholder:text-gray-400"
                />
                <div className="absolute left-2 top-2 text-gray-400"><SearchIcon size={16} /></div>
              </div>

              <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" title="Notifications">
                <ClipboardList size={16} />
              </button>

              <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" title="Quick actions">
                <Settings size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="p-6">
          {/* page container to match existing app styling */}
          <div className="max-w-full mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
