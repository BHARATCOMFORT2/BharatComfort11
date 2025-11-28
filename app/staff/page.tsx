"use client";

import Link from "next/link";

export default function StaffPortalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Staff Portal</h1>
        <p className="text-sm text-gray-500 mb-8">
          Telecallers ke liye dedicated login & registration portal
        </p>

        <div className="flex flex-col gap-4">
          {/* ✅ Staff Login */}
          <Link
            href="/staff/login"
            className="w-full px-4 py-2 rounded-md bg-black text-white text-sm text-center hover:bg-gray-800 transition"
          >
            Staff Login
          </Link>

          {/* ✅ Staff Register */}
          <Link
            href="/staff/register"
            className="w-full px-4 py-2 rounded-md border text-sm text-center hover:bg-gray-100 transition"
          >
            Staff Register
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Note: Registration ke baad admin approval zaroori hai.
        </p>
      </div>
    </div>
  );
}
