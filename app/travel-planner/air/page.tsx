"use client";

import { useState } from "react";

type Availability = "High" | "Medium" | "Low";

interface Flight {
  airline: string;
  code: string;
  type: "Direct" | "Connecting";
  depart: string;
  duration: string;
  fare: string;
  availability: Availability;
  bestFor?: string;
}

export default function AirTravelPlanner() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [flights, setFlights] = useState<Flight[] | null>(null);

  function findFlights() {
    if (!from || !to) {
      alert("From aur To airport / city bharo");
      return;
    }

    // 🔐 SAFE, RULE-BASED SAMPLE DATA (Phase-1)
    const sampleFlights: Flight[] = [
      {
        airline: "IndiGo",
        code: "6E-214",
        type: "Direct",
        depart: "Morning",
        duration: "1h 45m",
        fare: "₹3,500 – ₹4,500",
        availability: "High",
        bestFor: "Cheapest direct option",
      },
      {
        airline: "Air India",
        code: "AI-403",
        type: "Direct",
        depart: "Afternoon",
        duration: "1h 40m",
        fare: "₹4,800 – ₹6,000",
        availability: "Medium",
        bestFor: "Balanced comfort",
      },
      {
        airline: "Vistara",
        code: "UK-981",
        type: "Connecting",
        depart: "Evening",
        duration: "3h 20m",
        fare: "₹4,200 – ₹5,200",
        availability: "Low",
        bestFor: "Premium service",
      },
    ];

    setFlights(sampleFlights);
  }

  function availabilityColor(a: Availability) {
    if (a === "High") return "text-green-600";
    if (a === "Medium") return "text-yellow-600";
    return "text-red-600";
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Air Travel Planner</h1>
      <p className="text-gray-600 mb-6">
        Flights, duration, fare & seat availability (estimate)
      </p>

      {/* INPUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          placeholder="From Airport / City"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border p-3 rounded"
        />
        <input
          placeholder="To Airport / City"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border p-3 rounded"
        />
      </div>

      <button
        onClick={findFlights}
        className="bg-black text-white px-6 py-3 rounded hover:opacity-90"
      >
        Search Flights
      </button>

      {/* RESULTS */}
      {flights && (
        <div className="mt-8 space-y-4">
          {flights.map((f, idx) => (
            <div key={idx} className="border rounded p-4 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">
                    {f.airline} ({f.code})
                  </h3>
                  <p className="text-sm text-gray-600">
                    {f.type} • Departs: {f.depart} • Duration: {f.duration}
                  </p>
                </div>
                <span
                  className={`font-semibold ${availabilityColor(
                    f.availability
                  )}`}
                >
                  {f.availability} Availability
                </span>
              </div>

              <div className="mt-3 text-sm text-gray-700 space-y-1">
                <p>
                  <strong>Fare Range:</strong> {f.fare}
                </p>
                {f.bestFor && (
                  <p>
                    <strong>Best For:</strong> {f.bestFor}
                  </p>
                )}
              </div>

              {/* FUTURE CTA */}
              <button
                disabled
                className="mt-3 text-sm px-4 py-2 border rounded opacity-50 cursor-not-allowed"
              >
                Book Ticket (Coming Soon)
              </button>
            </div>
          ))}

          <div className="border rounded p-4 bg-green-50">
            <h3 className="font-semibold mb-2">⭐ Best Suggestions</h3>
            <p>Cheapest: IndiGo (Direct)</p>
            <p>Fastest: Air India (Direct)</p>
            <p>Balanced: Vistara (Connecting)</p>
          </div>

          <p className="text-xs text-gray-500">
            *Prices & availability approximate hain. Real-time booking external
            airline / aggregator platform par hoti hai.
          </p>
        </div>
      )}
    </div>
  );
}
