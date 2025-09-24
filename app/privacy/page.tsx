export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p><strong>Effective Date:</strong> [Insert Date]</p>

      <h2 className="text-xl font-semibold mt-4">1. Information We Collect</h2>
      <ul className="list-disc pl-6">
        <li>Personal details (name, email, phone, address)</li>
        <li>Login & authentication data (via Firebase)</li>
        <li>Payment details (via Razorpay)</li>
        <li>Booking, chat, and review data</li>
        <li>Device/location data (for maps & recommendations)</li>
      </ul>

      <h2 className="text-xl font-semibold mt-4">2. How We Use Information</h2>
      <p>We use your data to manage bookings, process payments, provide chat features, and improve our platform.</p>

      <h2 className="text-xl font-semibold mt-4">3. Data Sharing</h2>
      <p>We share data with Razorpay, Firebase, and Google Maps only as needed to provide services.</p>

      <h2 className="text-xl font-semibold mt-4">4. Security</h2>
      <p>We use encryption and secure storage, but users are responsible for protecting login credentials.</p>

      <h2 className="text-xl font-semibold mt-4">5. Your Rights</h2>
      <p>You can access, update, or delete your data by contacting us at <strong>support@bharatcomfort11.com</strong>.</p>
    </div>
  );
}
