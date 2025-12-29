// src/components/SidebarFilters.jsx
import React from "react";

export default function SidebarFilters({ filters = {}, setFilters = () => {}, onSearch = () => {} }) {
  const update = (patch) => setFilters(prev => ({ ...prev, ...patch }));

  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <h4 className="font-semibold mb-3 text-gray-800">Filters</h4>

      <label className="block text-sm text-gray-600 mb-1">Category</label>
      <select
        value={filters.category || ""}
        onChange={(e) => update({ category: e.target.value })}
        className="w-full p-2 mb-3 border rounded"
      >
        <option value="">Any</option>
        <option value="DTCP">DTCP</option>
        <option value="HMDA">HMDA</option>
        <option value="Other">Other</option>
      </select>

      <label className="block text-sm text-gray-600 mb-1">Property Type</label>
      <select
        value={filters.propertyType || ""}
        onChange={(e) => update({ propertyType: e.target.value })}
        className="w-full p-2 mb-3 border rounded"
      >
        <option value="">Any</option>
        <option value="Open Plot">Open Plot</option>
        <option value="Apartment">Apartment</option>
        <option value="Villa">Villa</option>
        <option value="Independent House">Independent House</option>
        <option value="Farmland">Farmland</option>
      </select>

      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Min price"
          value={filters.minPrice || ""}
          onChange={(e) => update({ minPrice: e.target.value })}
          className="flex-1 p-2 border rounded"
        />
        <input
          type="number"
          placeholder="Max price"
          value={filters.maxPrice || ""}
          onChange={(e) => update({ maxPrice: e.target.value })}
          className="flex-1 p-2 border rounded"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => { onSearch(); }}
          className="flex-1 bg-red-600 text-white py-2 rounded"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={() => setFilters({ q: "", category: "", propertyType: "", minPrice: "", maxPrice: "", sort: "newest" })}
          className="flex-1 border rounded py-2"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
