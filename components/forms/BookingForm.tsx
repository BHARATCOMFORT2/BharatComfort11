"use client";

import { useState } from "react";

interface BookingFormProps {
  listingId: string;
}

export default function BookingForm({ listingId }: BookingFormProps) {
  const [date, setDate] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Booking for listing:", listingId, "on date:", date);
    // call API here
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border rounded p-2 w-full"
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Book Now
      </button>
    </form>
  );
}
