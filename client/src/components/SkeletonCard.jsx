// src/components/SkeletonCard.jsx
import React from "react";

export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
    </div>
  );
}
