import type { Metadata } from "next";
import "@/styles/globals.css";
import "@/lib/payments/register";
import Navbar from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "BharatComfort",
  description: "Discover Comfort in Every Journey",
  icons: {
    icon: "/favicon.png", // ✅ Public folder favicon
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

        {/* ✅ FORCE FAVICON (Extra Safe Method) */}
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>

      <body className="bg-white text-gray-900">
        {/* ✅ Fixed Navbar */}
        <Navbar />

        {/* ✅ Main content with padding for navbar */}
        <main className="pt-24">{children}</main>
      </body>
    </html>
  );
}
