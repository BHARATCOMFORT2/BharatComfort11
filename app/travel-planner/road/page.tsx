"use client";

import { useState } from "react";

export default function RoadTravelPlanner() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState<any>(null);

  function calculateRoadTrip() {
    if (!from || !to) {
      alert("From aur To place select karo");
      return;
    }

    // Approx distance logic (Phase-1 safe)
    const distance = Math.floor(Math.random() * 400) + 100; // 100–500 km

    const bikeCost = distance * 3;
    const carCost = distance * 7;
    const suvCost = distance * 10;

    const busMin = distance * 1.2;
    const busMax = distance * 2;

    const taxiCost = distance * 12;
    const autoCost = distance < 30 ? distance * 15 : null;

    setResult({
      distance,
      time: `${Math.ceil(distance / 60)} – ${Math.ceil(distance / 45)} hrs`,

      personal: {
        bike: `₹${bikeCost}`,
        car: `₹${carCost}`,
        suv: `₹${suvCost}`,
      },

      bus: `₹${Math.floor(busMin)} – ₹${Math.floor(busMax)}`,

      taxi: `₹${taxiCost}`,

      auto: autoCost ? `₹${autoCost}` : "Not suitable (long distance)",

      best: {
        cheapest: "Bus",
        comfortable: "Taxi / Personal Car",
        flexible: "Personal Vehicle",
      },
    });
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Road Travel Planner</h1>
      <p className="text-gray-600 mb-6">
        Personal vehicle, bus, taxi, auto – sabka estimate ek jagah
      </p>

      {/* INPUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          placeholder="From City / Place"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border p-3 rounded"
        />
        <input
          placeholder="To City / Place"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border p-3 rounded"
        />
      </div>

      <button
        onClick={calculateRoadTrip}
        className="bg-black text-white px-6 py-3 rounded hover:opacity-90"
      >
        Calculate Road Options
      </button>

      {/* RESULT */}
      {result && (
        <div className="mt-8 space-y-6">
          <div className="border rounded p-4 bg-gray-50">
            <h2 className="font-semibold mb-2">Overall Distance & Time</h2>
            <p>📏 Distance: {result.distance} km</p>
            <p>⏱ Time: {result.time}</p>
          </div>

          <div className="border rounded p-4">
            <h3 className="font-semibold mb-2">🚗 Personal Vehicle</h3>
            <p>Bike: {result.personal.bike}</p>
            <p>Car: {result.personal.car}</p>
            <p>SUV: {result.personal.suv}</p>
          </div>

          <div className="border rounded p-4">
            <h3 className="font-semibold mb-2">🚌 Bus</h3>
            <p>Fare Range: {result.bus}</p>
            <p className="text-sm text-gray-500">
              Govt / Private buses (approx)
            </p>
          </div>

          <div className="border rounded p-4">
            <h3 className="font-semibold mb-2">🚕 Taxi / Cab</h3>
            <p>Estimated Cost: {result.taxi}</p>
          </div>

          <div className="border rounded p-4">
            <h3 className="font-semibold mb-2">🛺 Auto</h3>
            <p>{result.auto}</p>
          </div>

          <div className="border rounded p-4 bg-green-50">
            <h3 className="font-semibold mb-2">⭐ Best Options</h3>
            <p>Cheapest: {result.best.cheapest}</p>
            <p>Comfortable: {result.best.comfortable}</p>
            <p>Flexible: {result.best.flexible}</p>
          </div>

          <p className="text-xs text-gray-500">
            *Sab estimates approximate hain. Actual cost route, traffic aur
            provider par depend karega.
          </p>
        </div>
      )}
    </div>
  );
}
