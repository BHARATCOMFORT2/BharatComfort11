// app/layout.tsx
import type { Metadata } from "next";
import "@/styles/globals.css"; // ✅ Make sure this is here
import Navbar from "@/components/ui/Navbar"; // ✅ your navbar

export const metadata: Metadata = {
  title: "BharatComfort",
  description: "Discover Comfort in Every Journey",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        {/* Navbar on top */}
        <Navbar />

        {/* Page Content */}
        <main>{children}</main>

      </body>
    </html>
  );
}
