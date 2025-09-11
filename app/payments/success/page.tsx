"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get("session_id"); // Stripe session id

  useEffect(() => {
    const markPaymentSuccess = async () => {
      const user = auth.currentUser;
      if (!user || !sessionId) return;

      try {
        // Find pending payment in Firestore
        const q = query(
          collection(db, "payments"),
          where("userId", "==", user.uid),
          where("status", "==", "pending")
        );

        const snapshot = await getDocs(q);
        snapshot.forEach(async (doc) => {
          await updateDoc(doc.ref, { status: "success" });
        });
      } catch (err) {
        console.error("Error updating payment:", err);
      }
    };

    markPaymentSuccess();
  }, [sessionId]);

  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-green-600 mb-4">
        Payment Successful 🎉
      </h1>
      <p className="mb-6">Thank you for your booking! A confirmation has been sent to your email.</p>

      <button
        onClick={() => router.push("/user/dashboard")}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
