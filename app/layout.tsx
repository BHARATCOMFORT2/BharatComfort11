import type { Metadata } from "next";
import "@/styles/globals.css"; // ✅ if file is in /styles
// or use "./globals.css" if file is directly in /app
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
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
