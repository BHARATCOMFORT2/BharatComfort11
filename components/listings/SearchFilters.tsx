"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

export interface SearchFiltersState {
  location: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  rating: number;
  instantBooking: boolean;
  payAtHotel: boolean;
}

interface SearchFiltersProps {
  filters: SearchFiltersState;
  setFilters: (filters: SearchFiltersState) => void;
}

export default function SearchFilters({
  filters,
  setFilters,
}: SearchFiltersProps) {

  const [showFilters, setShowFilters] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {

    const { name, value, type } = e.target;

    let parsedValue: any = value;

    if (type === "number") {
      parsedValue = Number(value);
    }

    setFilters({
      ...filters,
      [name]: parsedValue,
    });

  };

  const toggleCheckbox = (name: keyof SearchFiltersState) => {

    setFilters({
      ...filters,
      [name]: !filters[name],
    });

  };

  const resetFilters = () => {

    setFilters({
      location: "",
      category: "all",
      minPrice: 0,
      maxPrice: 10000,
      rating: 0,
      instantBooking: false,
      payAtHotel: false,
    });

  };

  return (

<div className="bg-white shadow rounded-xl p-4">

{/* HEADER */}

<div className="flex items-center justify-between mb-4">

<h3 className="font-semibold text-gray-800">

Filters

</h3>

<button
onClick={()=>setShowFilters(prev=>!prev)}
className="md:hidden bg-gray-100 border rounded-lg p-2"
>

<SlidersHorizontal className="w-5 h-5 text-gray-700"/>

</button>

</div>

{/* FILTER GRID */}

<div
className={`grid md:grid-cols-5 gap-4 ${
showFilters ? "block" : "hidden md:grid"
}`}
>

{/* LOCATION */}

<div>

<label className="text-sm text-gray-600">

Location

</label>

<input
name="location"
value={filters.location}
onChange={handleChange}
placeholder="Enter city"
className="w-full border rounded-lg p-2"
/>

</div>

{/* CATEGORY */}

<div>

<label className="text-sm text-gray-600">

Category

</label>

<select
name="category"
value={filters.category}
onChange={handleChange}
className="w-full border rounded-lg p-2"
>

<option value="all">All</option>
<option value="hotel">Hotel</option>
<option value="resort">Resort</option>
<option value="homestay">Homestay</option>
<option value="apartment">Apartment</option>

</select>

</div>

{/* MIN PRICE */}

<div>

<label className="text-sm text-gray-600">

Min ₹

</label>

<input
type="number"
name="minPrice"
value={filters.minPrice}
onChange={handleChange}
className="w-full border rounded-lg p-2"
/>

</div>

{/* MAX PRICE */}

<div>

<label className="text-sm text-gray-600">

Max ₹

</label>

<input
type="number"
name="maxPrice"
value={filters.maxPrice}
onChange={handleChange}
className="w-full border rounded-lg p-2"
/>

</div>

{/* RATING */}

<div>

<label className="text-sm text-gray-600">

Min Rating

</label>

<input
type="number"
name="rating"
min={0}
max={5}
step={0.1}
value={filters.rating}
onChange={handleChange}
className="w-full border rounded-lg p-2"
/>

</div>

</div>

{/* EXTRA FILTERS */}

<div className="flex flex-wrap gap-4 mt-4">

<label className="flex items-center gap-2 text-sm">

<input
type="checkbox"
checked={filters.instantBooking}
onChange={()=>toggleCheckbox("instantBooking")}
/>

Instant Booking

</label>

<label className="flex items-center gap-2 text-sm">

<input
type="checkbox"
checked={filters.payAtHotel}
onChange={()=>toggleCheckbox("payAtHotel")}
/>

Pay at Hotel

</label>

</div>

{/* RESET */}

<div className="mt-4 flex justify-end">

<button
onClick={resetFilters}
className="text-sm text-gray-500 hover:text-red-500"
>

Reset Filters

</button>

</div>

</div>

  );

}
