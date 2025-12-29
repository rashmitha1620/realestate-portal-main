import React, { useEffect, useState } from "react";
import { fixMediaUrl } from "../utils/fixMediaUrl";

import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function ViewProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const nav = useNavigate();

  // Backend root (not /api)
  const SERVER_URL =
    import.meta.env.VITE_API_BASE?.replace("/api", "") ||
    "http://localhost:4000";

  // Current logged-in user - IMPORTANT: Now agent login sets isAgent: true
  const me = JSON.parse(localStorage.getItem("user") || "{}");
  const myId = me?.id || me?._id;
  const isAdmin = me?.isAdmin === true;
  const isAgent = me?.isAgent === true; // ADD THIS LINE

  /* ===========================
      LOAD PROPERTIES
  ============================ */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const res = isAdmin
          ? await api.get("/properties")
          : await api.get("/properties/agent/dashboard/list");

        setProperties(res.data || []);
      } catch (err) {
        console.error("Failed to load properties:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isAdmin]);

  /* ===========================
      DELETE PROPERTY
  ============================ */
  const handleDelete = async (property) => {
    if (!window.confirm(`Delete property: ${property.title}?`)) return;

    try {
      await api.delete(`/properties/${property._id}`);

      setProperties((prev) =>
        prev.filter((p) => p._id !== property._id)
      );

      alert("Deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  /* ===========================
      EDIT PROPERTY
  ============================ */
  const handleEdit = (property) => {
    localStorage.setItem("editProperty", JSON.stringify(property));
    nav(`/edit-property/${property._id}`);
  };

  if (loading) return <p>Loading properties...</p>;

  return (
    <div style={styles.container}>
      <h2>Your Uploaded Properties</h2>

      {properties.length === 0 ? (
        <p>No properties uploaded yet.</p>
      ) : (
        <div style={styles.grid}>
          {properties.map((p) => {
            const agentId = p.agent?._id || p.agent;
            const ownerId = p.owner?._id || p.owner;

            // ✅ UPDATED PERMISSION CHECK: Allow agents too
            const canEdit =
              isAdmin ||
              isAgent || // ADD THIS CHECK
              agentId === myId ||
              ownerId === myId;

           const imageUrl = p.images?.[0]
  ? fixMediaUrl(p.images[0])
  : "/no-image.png";
            return (
              <div key={p._id} style={styles.card}>
                <img
  src={imageUrl}
  alt="property"
  style={styles.image}
  onError={(e) => {
    e.target.src = "/no-image.png";
  }}
/>

                <h3 style={styles.title}>{p.title}</h3>
                <p style={styles.location}>
                  📍 {p.address || p.areaName || "Unknown"}
                </p>
                <p style={styles.price}>
                  ₹ {p.price?.toLocaleString("en-IN")}
                </p>

                <div style={styles.actions}>
                  <button
                    style={styles.viewBtn}
                    onClick={() => nav(`/property/${p._id}`)}
                  >
                    View
                  </button>

                  {canEdit && (
                    <>
                      <button
                        style={styles.editBtn}
                        onClick={() => handleEdit(p)}
                      >
                        Edit
                      </button>

                      <button
                        style={styles.deleteBtn}
                        onClick={() => handleDelete(p)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const styles = {
  container: { padding: 20, maxWidth: 1200, margin: "auto" },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 20,
    marginTop: 20,
  },

  card: {
    background: "#fff",
    padding: 12,
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
  },

  image: {
    width: "100%",
    height: 160,
    objectFit: "cover",
    borderRadius: 8,
  },

  title: { margin: "10px 0 4px", fontSize: 18, fontWeight: 600 },
  location: { margin: 0, color: "#555", fontSize: 14 },

  price: {
    marginTop: 6,
    fontWeight: "bold",
    color: "#2ecc71",
    fontSize: 16,
  },

  actions: {
    marginTop: "auto",
    display: "flex",
    gap: 8,
    justifyContent: "space-between",
  },

  viewBtn: {
    padding: "6px 10px",
    background: "#2980b9",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },

  editBtn: {
    padding: "6px 10px",
    background: "#f39c12",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },

  deleteBtn: {
    padding: "6px 10px",
    background: "#e74c3c",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};