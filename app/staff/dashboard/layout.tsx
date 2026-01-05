import StaffSidebar from "@/components/sidebar/StaffSidebar";

export default function StaffDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <StaffSidebar /> {/* ❌ no staff-session */}
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
