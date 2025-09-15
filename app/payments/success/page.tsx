"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useEffect } from "react";
import { db } from "@/lib/firebase"; // your firebase config
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function PaymentSuccessPage() {
  useEffect(() => {
    const savePayment = async () => {
      // Example booking/payment data
      const paymentId = crypto.randomUUID(); // or Razorpay’s payment ID
      await setDoc(doc(db, "payments", paymentId), {
        status: "success",
        amount: 150, // Replace with actual amount
        userId: "USER_ID_HERE", // Replace with current user id
        createdAt: serverTimestamp(),
      });
    };

    savePayment();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <motion.div
        className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="flex justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <CheckCircle className="w-20 h-20 text-green-500" />
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful 🎉
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for your payment. Your booking has been confirmed and a
          receipt has been sent to your email.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/partner/listings">
            <Button className="w-full sm:w-auto">Go to Listings</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full sm:w-auto">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
