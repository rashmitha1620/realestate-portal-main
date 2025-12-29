import React, { useEffect, useState } from "react";
import api from "../../api/api";
import { fixMediaUrl } from "../../utils/fixMediaUrl"; // ✅ ADD THIS

export default function AdminCompanyList() {
  const [list, setList] = useState([]);

  useEffect(() => {
    api.get("/company-banners").then((res) => setList(res.data));
  }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this company?")) return;
    await api.delete(`/company-banners/${id}`);
    setList((prev) => prev.filter((x) => x._id !== id));
  };

  return (
    <div className="admin-card">
      <h2>🏢 Company Banners</h2>

      {list.length === 0 && <p>No company banners found.</p>}

      {list.map((c) => (
        <div key={c._id} className="admin-row">
          {/* ✅ FIXED IMAGE */}
          <img
            src={fixMediaUrl(c.image)}
            width="110"
            height="70"
            alt={c.companyName}
            style={{
              objectFit: "cover",
              borderRadius: "6px",
              border: "1px solid #ddd",
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/no-image.png"; // fallback
            }}
          />

          <div style={{ flex: 1 }}>
            <b>{c.companyName}</b>
            <p style={{ margin: 0, color: "#666" }}>
              {c.serviceCategory}
            </p>
          </div>

          <button onClick={() => remove(c._id)}>🗑 Delete</button>
        </div>
      ))}
    </div>
  );
}
