// src/components/Pagination.jsx
import React from "react";

export default function Pagination({ page, setPage, totalPages }) {
  const prev = () => setPage(Math.max(1, page - 1));
  const next = () => setPage(Math.min(totalPages, page + 1));
  return (
    <div className="flex items-center gap-3">
      <button onClick={prev} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
      <div className="text-sm text-gray-700">Page <strong>{page}</strong> of {totalPages}</div>
      <button onClick={next} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
    </div>
  );
}
