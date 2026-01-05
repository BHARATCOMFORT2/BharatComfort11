import StaffSidebar from "@/components/sidebar/StaffSidebar";
import { getStaffSession } from "@/lib/staff-session"; // example

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getStaffSession(); // 👈 STAFF FETCH

  return (
    <div className="flex min-h-screen">
      <StaffSidebar staff={staff} /> {/* ✅ REQUIRED */}
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
