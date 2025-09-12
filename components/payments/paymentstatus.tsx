"use client";

type PaymentStatusProps = {
  success: boolean;
  message?: string;
};

export default function PaymentStatus({ success, message }: PaymentStatusProps) {
  return (
    <div
      className={`p-6 border rounded-lg shadow text-center ${
        success ? "bg-green-50" : "bg-red-50"
      }`}
    >
      <h2
        className={`text-2xl font-bold mb-2 ${
          success ? "text-green-600" : "text-red-600"
        }`}
      >
        {success ? "✅ Payment Successful" : "❌ Payment Failed"}
      </h2>
      <p className="text-gray-700">{message || "Thank you for using BharatComfort."}</p>
    </div>
  );
}
