"use client";

import { ReactNode, useState } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";

interface Props {
  title: string;
  children: ReactNode;
  profile?: {
    name?: string;
    role?: string;
    profilePic?: string;
  };
}

export default function DashboardLayout({ title, children, profile }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/auth/login");
  };

  const navLinks =
    profile?.role === "partner"
      ? [
          { name: "Dashboard", path: "/partner/dashboard" },
          { name: "Listings", path: "/partner/listings" },
          { name: "Bookings", path: "/partner/bookings" },
        ]
      : [
          { name: "Dashboard", path: "/user/dashboard" },
          { name: "My Trips", path: "/user/bookings" },
          { name: "Settings", path: "/user/settings" },
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
          {profile?.profilePic ? (
            <img
              src={profile.profilePic}
              alt="Profile"
              className="w-16 h-16 rounded-full mb-3 border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 mb-3" />
          )}
          <h2 className="text-lg font-semibold">{profile?.name || "User"}</h2>
          <p className="text-sm text-gray-500 capitalize">{profile?.role}</p>
        </div>

        <nav className="mt-6 space-y-2 px-4">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => router.push(link.path)}
              className="block w-full text-left px-4 py-2 rounded-lg hover:bg-blue-50 text-gray-700"
            >
              {link.name}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 w-full flex justify-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 sm:ml-64">
        <header className="flex justify-between items-center bg-white shadow px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="sm:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X /> : <Menu />}
            </button>
            <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
