import React, { useEffect, useState } from "react";
import api from "../api/api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await api.get("/admin/stats");
        setStats(res.data);
      } catch (err) {
        setError("❌ Unauthorized or not an admin.");
      }
    }
    loadStats();
  }, []);

  if (error) {
    return (
      <div>
        <h2>Dashboard</h2>
        <p style={{ color: "red" }}>{error}</p>
        <p>Make sure you're logged in as an admin user.</p>
      </div>
    );
  }

  if (!stats) {
    return <p>Loading admin stats...</p>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Admin Dashboard</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        <div
          style={{
            background: "#2563eb",
            color: "white",
            padding: "20px",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <h3>👥 Users</h3>
          <p style={{ fontSize: "2em", fontWeight: "bold" }}>
            {stats.users}
          </p>
        </div>

        <div
          style={{
            background: "#10b981",
            color: "white",
            padding: "20px",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <h3>🏡 Properties</h3>
          <p style={{ fontSize: "2em", fontWeight: "bold" }}>
            {stats.properties}
          </p>
        </div>

        <div
          style={{
            background: "#f59e0b",
            color: "white",
            padding: "20px",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <h3>💳 Successful Payments</h3>
          <p style={{ fontSize: "2em", fontWeight: "bold" }}>
            {stats.payments}
          </p>
        </div>
      </div>
    </div>
  );
}
