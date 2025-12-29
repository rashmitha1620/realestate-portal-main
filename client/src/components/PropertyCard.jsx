import React from "react";

export default function PropertyCard({ property }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: "12px", borderRadius: "6px", background: "white" }}>
      <h3>{property.title}</h3>
      <p>{property.propertyType} • {property.category}</p>
      <p>Area: {property.areaName}</p>
      <p>Price: ₹{property.price}</p>
      {property.videoUrl && (
        <p>
          <a href={property.videoUrl} target="_blank" rel="noreferrer">🎥 Watch Video</a>
        </p>
      )}
    </div>
  );
}
