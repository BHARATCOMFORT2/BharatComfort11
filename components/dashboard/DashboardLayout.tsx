"use client";

import { ReactNode, useState, useEffect } from "react";
import { auth } from "@/lib/firebase-client";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";

interface Props {
  title: string;
  children: ReactNode;
  profile?: {
    name?: string;
    role?: "admin" | "partner" | "user" | "staff" | "superadmin";
    profilePic?: string;
  };
}

export default function DashboardLayout({ title, children, profile }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ AUTO ROLE BASED REDIRECT
  useEffect(() => {
    if (!profile?.role) return;

    if (profile.role === "staff" && !pathname.startsWith("/staff")) {
      router.replace("/staff/dashboard");
      return;
    }

    if (profile.role === "user" && !pathname.startsWith("/user")) {
      router.replace("/user/dashboard");
      return;
    }

    if (profile.role === "partner" && !pathname.startsWith("/partner")) {
      router.replace("/partner/dashboard");
      return;
    }

    if (
      (profile.role === "admin" || profile.role === "superadmin") &&
      !pathname.startsWith("/admin")
    ) {
      router.replace("/admin/dashboard");
      return;
    }
  }, [profile, pathname, router]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/staff/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!mounted) return null;

  const userLinks = [
    { name: "Dashboard", path: "/user/dashboard" },
    { name: "My Trips", path: "/user/bookings" },
    { name: "Settings", path: "/user/settings" },
  ];

  const partnerLinks = [
    { name: "Dashboard", path: "/partner/dashboard" },
    { name: "Listings", path: "/partner/listings" },
    { name: "Bookings", path: "/partner/bookings" },
    { name: "Earnings", path: "/partner/earnings" },
    { name: "Settlements", path: "/partner/settlements" },
    { name: "Reviews", path: "/partner/reviews" },
    { name: "Promotions", path: "/partner/promotions" },
    { name: "Notifications", path: "/partner/notifications" },
    { name: "Support", path: "/partner/support" },
    { name: "Settings", path: "/partner/settings" },
    { name: "Policies", path: "/partner/policies" },
  ];

 const staffLinks = [
  { name: "📊 Dashboard", path: "/staff/dashboard" },
  { name: "📞 Leads / Tasks", path: "/staff/dashboard" },
  { name: "⭐ Interested Partners", path: "/staff/InterestedPartners" },
  { name: "⏰ Callbacks", path: "/staff/CallbackLeads" },
  { name: "📈 Performance", path: "/staff/performance" },
  { name: "💰 Earnings", path: "/staff/earnings" },
  { name: "⚙️ Settings", path: "/staff/settings" },
];

  const adminLinks = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Users", path: "/admin/dashboard/users" },
    { name: "Partners", path: "/admin/dashboard/partners" },
    { name: "✅ Partner Leads", path: "/admin/partners-confirmed" },
    { name: "KYC", path: "/admin/dashboard/kyc" },
    { name: "Listings", path: "/admin/dashboard/homepage" },
    { name: "Staff Management", path: "/admin/staff" },
    { name: "Staff Performance", path: "/admin/staff/performance" },
    { name: "Settlements", path: "/admin/dashboard/settlements" },
    { name: "Reports", path: "/admin/dashboard/reports" },
    { name: "Settings", path: "/admin/dashboard/settings" },
  ];

  const navLinks =
    profile?.role === "admin" || profile?.role === "superadmin"
      ? adminLinks
      : profile?.role === "partner"
      ? partnerLinks
      : profile?.role === "staff"
      ? staffLinks
      : userLinks;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* ✅ MOBILE OVERLAY */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 bg-black/40 z-20 sm:hidden"
        />
      )}

      {/* ✅ SIDEBAR (SCROLL FIXED) */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-30
        transform transition-transform duration-300
        ${menuOpen ? "translate-x-0" : "-translate-x-full"}
        sm:translate-x-0
        flex flex-col`}
      >
        {/* ✅ CLOSE (MOBILE) */}
        <div className="p-4 flex justify-end sm:hidden">
          <button onClick={() => setMenuOpen(false)}>
            <X />
          </button>
        </div>

        {/* ✅ PROFILE */}
        <div className="p-6 flex flex-col items-center border-b shrink-0">
          {profile?.profilePic ? (
            <img
              src={profile.profilePic}
              alt="Profile"
              className="w-20 h-20 rounded-full mb-2 border"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 mb-2" />
          )}

          <h2 className="text-sm font-semibold">
            {profile?.name || "Staff"}
          </h2>

          <p className="text-xs text-gray-500 capitalize">
            {profile?.role || "staff"}
          </p>
        </div>

        {/* ✅ SCROLLABLE MENU */}
        <nav className="flex-1 overflow-y-auto mt-4 space-y-2 px-4">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => {
                router.push(link.path);
                setMenuOpen(false);
              }}
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

        {/* ✅ LOGOUT (FIXED BOTTOM) */}
        <div className="border-t p-4 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg w-full justify-center"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* ✅ MAIN CONTENT */}
      <div className="flex-1 sm:ml-64 w-full">
        <header className="flex justify-between items-center bg-white shadow px-4 py-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="sm:hidden" onClick={() => setMenuOpen(true)}>
              <Menu />
            </button>

            <h1 className="text-lg sm:text-xl font-bold text-gray-800">
              {title}
            </h1>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
