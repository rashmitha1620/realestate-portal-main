// src/components/SearchBar.jsx
import React, { useEffect, useState } from "react";

export default function SearchBar({ initialQ = "", onSearch }) {
  const [q, setQ] = useState(initialQ);

  // debounce so typing doesn't spam filter
  useEffect(() => {
    const t = setTimeout(() => onSearch(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSearch(q); }} className="mb-4">
      <div className="flex gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title or area..."
          className="flex-1 p-3 rounded-lg border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="px-3 py-2 bg-gray-100 border rounded text-sm"
            aria-label="clear"
          >
            Clear
          </button>
        )}
        <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Search</button>
      </div>
    </form>
  );
}
