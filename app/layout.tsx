import type { Metadata } from "next";
import "../styles/globals.css";

import { Inter, Poppins } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({ weight: ["400", "600", "700"], subsets: ["latin"], variable: "--font-poppins" });


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
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
