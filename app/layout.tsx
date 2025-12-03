import type { Metadata } from "next";
import "@/styles/globals.css";
import "@/lib/payments/register"; 
import Navbar from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "BharatComfort",
  description: "Discover Comfort in Every Journey",
  icons: {
    icon: "/favicon.png",   // ✅ YAHI AAPKA FAVICON LINK HAI
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Razorpay Checkout Script */}
        <script
          src="https://checkout.razorpay.com/v1/checkout.js"
          async
        ></script>
      </head>
      <body className="bg-white text-gray-900">
        {/* Fixed Navbar */}
        <Navbar />

        {/* Main content with top padding for navbar */}
        <main className="pt-24">{children}</main>
      </body>
    </html>
  );
}
