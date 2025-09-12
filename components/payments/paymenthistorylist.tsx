"use client";

type Payment = {
  id: string;
  item: string;
  amount: number;
  currency?: string;
  status: "success" | "failed" | "pending";
  date: string;
};

type PaymentHistoryListProps = {
  payments: Payment[];
};

export default function PaymentHistoryList({ payments }: PaymentHistoryListProps) {
  if (!payments || payments.length === 0) {
    return (
      <p className="text-center text-gray-500 py-6">
        No past payments found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg shadow bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2">Item</th>
            <th className="px-4 py-2">Amount</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-t">
              <td className="px-4 py-2">{payment.item}</td>
              <td className="px-4 py-2">
                {payment.currency || "INR"} {payment.amount}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    payment.status === "success"
                      ? "bg-green-100 text-green-700"
                      : payment.status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {payment.status}
                </span>
              </td>
              <td className="px-4 py-2">{payment.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
