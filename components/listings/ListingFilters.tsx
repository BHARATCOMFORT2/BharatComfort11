"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";

interface Filters {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  location: string;
  rating: number;
  onlyPayAtHotel?: boolean;
  instantBooking?: boolean;
}

interface ListingFiltersProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  onSearch: (value: string) => void;
}

export default function ListingFilters({
  filters,
  setFilters,
  onSearch,
}: ListingFiltersProps) {

  const [searchInput, setSearchInput] = useState(filters.search);
  const [showFilters, setShowFilters] = useState(false);

  /* sync search with parent */
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  /* handle inputs */
  const handleInputChange = (
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

  /* handle checkboxes */

  const handleCheckboxChange = (name: string) => {

    setFilters({
      ...filters,
      [name]: !filters[name as keyof Filters],
    });

  };

  /* search submit */

  const handleSearchSubmit = (e: React.FormEvent) => {

    e.preventDefault();
    onSearch(searchInput);

  };

  /* reset */

  const resetFilters = () => {

    const defaultFilters: Filters = {
      search: "",
      category: "all",
      minPrice: 0,
      maxPrice: 10000,
      location: "",
      rating: 0,
      onlyPayAtHotel: false,
      instantBooking: false,
    };

    setSearchInput("");
    setFilters(defaultFilters);

  };

  return (

<div className="bg-white shadow rounded-xl p-4">

{/* SEARCH BAR */}

<div className="flex items-center gap-2 mb-4">

<form
onSubmit={handleSearchSubmit}
className="flex items-center gap-2 flex-1"
>

<input

type="text"
value={searchInput}
onChange={(e)=>setSearchInput(e.target.value)}
placeholder="Search stays..."
className="flex-1 border rounded-lg p-2"

/>

<button
type="submit"
className="bg-yellow-600 text-white px-4 py-2 rounded-lg"
>

Search

</button>

</form>

{/* MOBILE FILTER BUTTON */}

<button

type="button"
onClick={()=>setShowFilters(prev=>!prev)}
className="ml-2 md:hidden bg-gray-100 border rounded-lg p-2"

>

<SlidersHorizontal className="w-5 h-5 text-gray-700"/>

</button>

</div>

{/* FILTER GRID */}

<div
className={`grid md:grid-cols-5 gap-4 transition-all duration-300 ${
showFilters
? "max-h-[600px] opacity-100"
: "max-h-0 md:max-h-full overflow-hidden md:opacity-100"
}`}
>

{/* LOCATION */}

<div>

<label className="block text-sm text-gray-600">

Location

</label>

<input

name="location"
value={filters.location}
onChange={handleInputChange}
placeholder="Enter city"
className="w-full border rounded-lg p-2"

/>

</div>

{/* CATEGORY */}

<div>

<label className="block text-sm text-gray-600">

Category

</label>

<select

name="category"
value={filters.category}
onChange={handleInputChange}
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

<label className="block text-sm text-gray-600">

Min ₹

</label>

<input

type="number"
name="minPrice"
value={filters.minPrice}
onChange={handleInputChange}
className="w-full border rounded-lg p-2"

/>

</div>

{/* MAX PRICE */}

<div>

<label className="block text-sm text-gray-600">

Max ₹

</label>

<input

type="number"
name="maxPrice"
value={filters.maxPrice}
onChange={handleInputChange}
className="w-full border rounded-lg p-2"

/>

</div>

{/* RATING */}

<div>

<label className="block text-sm text-gray-600">

Min Rating

</label>

<input

type="number"
name="rating"
min={0}
max={5}
step={0.1}
value={filters.rating}
onChange={handleInputChange}
className="w-full border rounded-lg p-2"

/>

</div>

</div>

{/* EXTRA FILTERS */}

<div className="flex flex-wrap gap-4 mt-4">

<label className="flex items-center gap-2 text-sm">

<input
type="checkbox"
checked={filters.onlyPayAtHotel || false}
onChange={()=>handleCheckboxChange("onlyPayAtHotel")}
/>

Pay at Hotel

</label>

<label className="flex items-center gap-2 text-sm">

<input
type="checkbox"
checked={filters.instantBooking || false}
onChange={()=>handleCheckboxChange("instantBooking")}
/>

Instant Booking

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
