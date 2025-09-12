"use client";

type PaymentSummaryProps = {
  item: string;
  price: number;
  currency?: string;
};

export default function PaymentSummary({
  item,
  price,
  currency = "INR",
}: PaymentSummaryProps) {
  return (
    <div className="p-4 border rounded-lg shadow bg-gray-50">
      <h3 className="font-semibold text-lg mb-2">Order Summary</h3>
      <div className="flex justify-between mb-1">
        <span>{item}</span>
        <span>
          {currency} {price}
        </span>
      </div>
      <div className="flex justify-between font-bold border-t pt-2">
        <span>Total</span>
        <span>
          {currency} {price}
        </span>
      </div>
    </div>
  );
}
