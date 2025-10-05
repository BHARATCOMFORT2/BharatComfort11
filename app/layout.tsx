import type { Metadata } from "next";
import "@/styles/globals.css";
import Navbar from "@/components/ui/Navbar";

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
        {/* Fixed Navbar */}
        <Navbar />

        {/* Main content with top padding for navbar */}
        <main className="pt-24">{children}</main>
      </body>
    </html>
  );
}
