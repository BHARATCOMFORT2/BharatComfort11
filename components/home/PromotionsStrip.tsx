"use client";

export default function PromotionsStrip() {
  return (
    <section className="py-12 bg-gradient-to-r from-yellow-500 to-yellow-600 text-center">
      <h2 className="text-3xl font-extrabold text-blue-950 mb-4">
        Special Festival Offers 🎉
      </h2>
      <p className="text-lg text-blue-950 mb-6">
        Save up to <span className="font-bold">40%</span> on bookings this season!
      </p>
      <a
        href="/promotions"
        className="px-6 py-3 bg-blue-900 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-800 transition"
      >
        Grab Deal
      </a>
    </section>
  );
}
