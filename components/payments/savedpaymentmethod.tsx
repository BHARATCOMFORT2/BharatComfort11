"use client";

type PaymentMethod = {
  id: string;
  type: "card" | "upi" | "paypal";
  details: string;
};

type SavedPaymentMethodsProps = {
  methods: PaymentMethod[];
  onDelete: (id: string) => void;
};

export default function SavedPaymentMethods({
  methods,
  onDelete,
}: SavedPaymentMethodsProps) {
  if (methods.length === 0) {
    return <p className="text-gray-600">No saved payment methods yet.</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Saved Payment Methods</h3>
      <ul className="space-y-3">
        {methods.map((method) => (
          <li
            key={method.id}
            className="flex items-center justify-between p-3 border rounded-lg shadow-sm bg-white"
          >
            <div>
              <p className="font-medium capitalize">{method.type}</p>
              <p className="text-sm text-gray-600">
                {method.type === "card"
                  ? `**** **** **** ${method.details.slice(-4)}`
                  : method.details}
              </p>
            </div>
            <button
              onClick={() => onDelete(method.id)}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
