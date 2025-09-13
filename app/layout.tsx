import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BharatComfort – Global Travel & Hospitality Platform",
  description:
    "Discover hotels, restaurants, and travel experiences worldwide with BharatComfort. Book, explore, and connect with trusted partners.",
  keywords: [
    "BharatComfort",
    "hotels",
    "restaurants",
    "travel",
    "bookings",
    "global platform",
  ],
  authors: [{ name: "BharatComfort" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <head><script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
