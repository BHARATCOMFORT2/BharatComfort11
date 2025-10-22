"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

interface Filters {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  location: string;
  rating: number;
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  return (
    <div className="bg-white shadow rounded-xl p-4">
      {/* 🔍 Search + Toggle */}
      <div className="flex justify-between items-center mb-3">
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-2 flex-1"
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search stays..."
            className="flex-1 border rounded-lg p-2"
          />
          <button
            type="submit"
            className="bg-yellow-600 text-white px-3 py-2 rounded-lg"
          >
            Search
          </button>
        </form>

        {/* 🪄 Mobile Toggle */}
        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          className="ml-3 md:hidden bg-gray-100 border rounded-lg p-2"
        >
          <SlidersHorizontal className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* 🎛️ Filter Options (Collapsible on Mobile) */}
      <div
        className={`grid md:grid-cols-5 gap-4 transition-all duration-300 ${
          showFilters ? "max-h-[500px] opacity-100" : "max-h-0 md:max-h-full overflow-hidden md:opacity-100"
        }`}
      >
        {/* 📍 Location */}
        <div>
          <label className="block text-sm text-gray-600">Location</label>
          <input
            name="location"
            value={filters.location}
            onChange={handleInputChange}
            placeholder="Enter city"
            className="w-full border rounded-lg p-2"
          />
        </div>

        {/* 🏷️ Category */}
        <div>
          <label className="block text-sm text-gray-600">Category</label>
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

        {/* 💰 Price Range */}
        <div>
          <label className="block text-sm text-gray-600">Min ₹</label>
          <input
            type="number"
            name="minPrice"
            value={filters.minPrice}
            onChange={handleInputChange}
            className="w-full border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Max ₹</label>
          <input
            type="number"
            name="maxPrice"
            value={filters.maxPrice}
            onChange={handleInputChange}
            className="w-full border rounded-lg p-2"
          />
        </div>

        {/* ⭐ Rating */}
        <div>
          <label className="block text-sm text-gray-600">Min Rating</label>
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
    </div>
  );
}
