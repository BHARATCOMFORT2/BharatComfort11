"use client";
import { useState } from "react";

export default function BookingForm() {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Booking for ${name} on ${date}`);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded">
      <input
        type="text"
        placeholder="Your Name"
        className="border p-2 w-full mb-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="date"
        className="border p-2 w-full mb-2"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        Book Now
      </button>
    </form>
  );
}
