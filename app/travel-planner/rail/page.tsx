"use client";

import { useState } from "react";

type Availability = "High" | "Medium" | "Low";

interface Train {
  name: string;
  number: string;
  depart: string;
  duration: string;
  classes: string[];
  fare: string;
  availability: Availability;
  bestFor?: string;
}

export default function RailTravelPlanner() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [trains, setTrains] = useState<Train[] | null>(null);

  function calculateRailOptions() {
    if (!from || !to) {
      alert("From aur To station / city bharo");
      return;
    }

    // 🔐 SAFE, RULE-BASED DATA (Phase-1)
    const sampleTrains: Train[] = [
      {
        name: "Shramjeevi Express",
        number: "12391",
        depart: "Evening",
        duration: "12h 30m",
        classes: ["Sleeper", "3A", "2A"],
        fare: "₹450 – ₹1,500",
        availability: "Medium",
        bestFor: "Overnight travel",
      },
      {
        name: "Garib Rath",
        number: "12561",
        depart: "Night",
        duration: "11h 45m",
        classes: ["3A"],
        fare: "₹700 – ₹900",
        availability: "High",
        bestFor: "Cheapest AC option",
      },
      {
        name: "Rajdhani Express",
        number: "12309",
        depart: "Afternoon",
        duration: "9h 50m",
        classes: ["3A", "2A"],
        fare: "₹1,400 – ₹2,000",
        availability: "Low",
        bestFor: "Fastest journey",
      },
    ];

    setTrains(sampleTrains);
  }

  function availabilityColor(a: Availability) {
    if (a === "High") return "text-green-600";
    if (a === "Medium") return "text-yellow-600";
    return "text-red-600";
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Rail Travel Planner</h1>
      <p className="text-gray-600 mb-6">
        Train options, timing, fare & seat availability (estimate)
      </p>

      {/* INPUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          placeholder="From Station / City"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border p-3 rounded"
        />
        <input
          placeholder="To Station / City"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border p-3 rounded"
        />
      </div>

      <button
        onClick={calculateRailOptions}
        className="bg-black text-white px-6 py-3 rounded hover:opacity-90"
      >
        Find Trains
      </button>

      {/* RESULTS */}
      {trains && (
        <div className="mt-8 space-y-4">
          {trains.map((train) => (
            <div
              key={train.number}
              className="border rounded p-4 bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">
                    {train.name} ({train.number})
                  </h3>
                  <p className="text-sm text-gray-600">
                    Departs: {train.depart} • Duration: {train.duration}
                  </p>
                </div>
                <span
                  className={`font-semibold ${availabilityColor(
                    train.availability
                  )}`}
                >
                  {train.availability} Availability
                </span>
              </div>

              <div className="mt-3 text-sm text-gray-700 space-y-1">
                <p>
                  <strong>Classes:</strong> {train.classes.join(", ")}
                </p>
                <p>
                  <strong>Fare Range:</strong> {train.fare}
                </p>
                {train.bestFor && (
                  <p>
                    <strong>Best For:</strong> {train.bestFor}
                  </p>
                )}
              </div>
            </div>
          ))}

          <div className="border rounded p-4 bg-green-50">
            <h3 className="font-semibold mb-2">⭐ Best Suggestions</h3>
            <p>Cheapest: Garib Rath</p>
            <p>Overnight: Shramjeevi Express</p>
            <p>Fastest: Rajdhani Express</p>
          </div>

          <p className="text-xs text-gray-500">
            *Seat availability & fares are approximate. Real-time booking
            IRCTC / partner platform par hoti hai.
          </p>
        </div>
      )}
    </div>
  );
}
