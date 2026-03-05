"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";

export default function ListingsSearch() {

  const router = useRouter();

  const today = new Date();
  const tomorrow = addDays(today, 1);

  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState(format(today, "yyyy-MM-dd"));
  const [checkOut, setCheckOut] = useState(format(tomorrow, "yyyy-MM-dd"));
  const [guests, setGuests] = useState(1);

  const handleSearch = (e: React.FormEvent) => {

    e.preventDefault();

    const params = new URLSearchParams();

    if (location) params.set("location", location);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("guests", String(guests));

    router.push(`/listings?${params.toString()}`);

  };

  return (

<div className="bg-white rounded-xl shadow-md p-4 md:p-6">

<form
onSubmit={handleSearch}
className="grid grid-cols-1 md:grid-cols-4 gap-4"
>

{/* DESTINATION */}

<div>

<label className="text-sm text-gray-600">

Destination

</label>

<input
type="text"
placeholder="Where are you going?"
value={location}
onChange={(e)=>setLocation(e.target.value)}
className="w-full border rounded-lg p-2"
/>

</div>

{/* CHECKIN */}

<div>

<label className="text-sm text-gray-600">

Check-in

</label>

<input
type="date"
value={checkIn}
min={format(today,"yyyy-MM-dd")}
onChange={(e)=>setCheckIn(e.target.value)}
className="w-full border rounded-lg p-2"
/>

</div>

{/* CHECKOUT */}

<div>

<label className="text-sm text-gray-600">

Check-out

</label>

<input
type="date"
value={checkOut}
min={checkIn}
onChange={(e)=>setCheckOut(e.target.value)}
className="w-full border rounded-lg p-2"
/>

</div>

{/* GUESTS */}

<div>

<label className="text-sm text-gray-600">

Guests

</label>

<select
value={guests}
onChange={(e)=>setGuests(Number(e.target.value))}
className="w-full border rounded-lg p-2"
>

{Array.from({ length: 10 }, (_, i) => i + 1).map((n)=>(
<option key={n} value={n}>
{n} Guest{n > 1 && "s"}
</option>
))}

</select>

</div>

{/* BUTTON */}

<div className="md:col-span-4">

<button
type="submit"
className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg font-semibold"
>

Search Stays

</button>

</div>

</form>

</div>

  );

}
