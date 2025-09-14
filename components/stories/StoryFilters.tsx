"use client";

export default function StoryFilters() {
  return (
    <div className="flex gap-4 mb-6">
      <select className="border p-2 rounded">
        <option>All Categories</option>
        <option>Travel</option>
        <option>Food</option>
        <option>Culture</option>
        <option>Guides</option>
      </select>
      <input
        type="text"
        placeholder="Search stories..."
        className="border p-2 rounded flex-1"
      />
    </div>
  );
}
