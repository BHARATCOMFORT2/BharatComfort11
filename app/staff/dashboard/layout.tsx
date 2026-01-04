
import StaffSidebar from "@/components/sidebar/StaffSidebar";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <StaffSidebar />
      <main className="flex-1 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
