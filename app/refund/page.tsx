export default function RefundPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Refund & Cancellation Policy</h1>
      <p><strong>Effective Date:</strong> [Insert Date]</p>

      <h2 className="text-xl font-semibold mt-4">1. Cancellation by User</h2>
      <ul className="list-disc pl-6">
        <li>7+ days before travel → Full refund</li>
        <li>3–6 days before travel → 50% refund</li>
        <li>Less than 3 days → No refund</li>
      </ul>

      <h2 className="text-xl font-semibold mt-4">2. Cancellation by Partner</h2>
      <p>If a partner cancels, you’ll get a 100% refund.</p>

      <h2 className="text-xl font-semibold mt-4">3. Refund Process</h2>
      <p>Refunds are processed via Razorpay within 7–10 business days.</p>

      <h2 className="text-xl font-semibold mt-4">4. Non-Refundable Cases</h2>
      <p>No refunds for no-shows, late cancellations, or already-used services.</p>
    </div>
  );
}
