"use client";

type BookingCardProps = {
  item: string;
  amount: number;
  currency?: string;
  status: "success" | "failed" | "pending";
  date: string;
};

export default function BookingCard({
  item,
  amount,
  currency = "INR",
  status,
  date,
}: BookingCardProps) {
  return (
    <div className="p-4 border rounded-lg shadow bg-white mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">{item}</h3>
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            status === "success"
              ? "bg-green-100 text-green-700"
              : status === "failed"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="flex justify-between text-sm text-gray-700">
        <span>Date:</span>
        <span>{date}</span>
      </div>

      <div className="flex justify-between text-sm font-bold mt-2">
        <span>Total Paid:</span>
        <span>
          {currency} {amount}
        </span>
      </div>
    </div>
  );
}
