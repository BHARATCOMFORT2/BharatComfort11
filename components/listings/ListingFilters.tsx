"use client";

export default function ListingFilters() {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <select className="border p-2 rounded">
        <option>All Categories</option>
        <option>Hotels</option>
        <option>Restaurants</option>
        <option>Travel Spots</option>
      </select>
      <select className="border p-2 rounded">
        <option>Sort by</option>
        <option>Price: Low to High</option>
        <option>Price: High to Low</option>
        <option>Newest</option>
      </select>
      <input
        type="text"
        placeholder="Search..."
        className="border p-2 rounded flex-1"
      />
    </div>
  );
}
