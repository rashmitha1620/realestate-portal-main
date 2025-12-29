import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";

export default function AdminDashboardHome() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await api.get("/admin/summary");
        setSummary(res.data.summary);
      } catch (err) {
        console.error(err);
        setError("❌ Failed to load admin summary");
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="container" style={{ padding: "30px" }}>
      <h2>🏠 Admin Dashboard</h2>
      <p style={{ color: "#555" }}>Welcome, Portal Administrator</p>

      {/* ✅ Stats Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        <div
          style={{
            background: "#e3f2fd",
            padding: "20px",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <h3>{summary.totalAgents}</h3>
          <p>Registered Agents</p>
        </div>

        <div
          style={{
            background: "#e8f5e9",
            padding: "20px",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <h3>{summary.totalProperties}</h3>
          <p>Properties Posted</p>
        </div>

        <div
          style={{
            background: "#fff3e0",
            padding: "20px",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <h3>{summary.totalEnquiries}</h3>
          <p>Customer Enquiries</p>
        </div>
      </div>

      {/* 🔗 Quick Actions */}
      <div style={{ marginTop: "40px" }}>
        <h3>Quick Actions</h3>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
          <Link
            to="/property-form"
            style={{
              background: "#1976d2",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            ➕ Post Property
          </Link>

          <Link
            to="/agent-register"
            style={{
              background: "#388e3c",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            👤 Add Agent
          </Link>

          <Link
            to="/admin-dashboard"
            style={{
              background: "#f57c00",
              color: "#fff",
              padding: "10px 20px",
               textDecoration: "none",
            }}
          >
            ⚙️ Manage Property Dealer
          </Link>

          <Link
            to="/view-enquiries"
            style={{
              background: "#7b1fa2",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            ✉️ View Enquiries
          </Link>
        </div>
      </div>
    </div>
  );
}
