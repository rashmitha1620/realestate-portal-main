import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

export default function AgentDashboard() {
  const [agent, setAgent] = useState(null);
  const [properties, setProperties] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [referredProviders, setReferredProviders] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState("checking");
  const nav = useNavigate();

  // -------------------------------------------------
  // Check Session Using Correct Token (agentToken)
  // -------------------------------------------------
  const checkSession = async () => {
    try {
      const token = localStorage.getItem("agentToken");
      if (!token) return setSessionStatus("expired");

      await api.get("/auth/me");
      setSessionStatus("active");
    } catch (err) {
      setSessionStatus("refreshing");

      try {
        const { data } = await api.post("/auth/refresh", {}, { withCredentials: true });

        if (data.token) {
          localStorage.setItem("agentToken", data.token);
          api.defaults.headers.Authorization = `Bearer ${data.token}`;
          setSessionStatus("active");
        } else {
          setSessionStatus("expired");
        }
      } catch {
        setSessionStatus("expired");
      }
    }
  };

  // -------------------------------------------------
  // Load Dashboard Data
  // -------------------------------------------------
  useEffect(() => {
    async function loadDashboard() {
      try {
        await checkSession();

      const { data: me } = await api.get("/agents/me");
setAgent(me);


        const { data: props } = await api.get("/properties/agent/dashboard/list");
        setProperties(props);

        const { data: enqs } = await api.get("/enquiries/my-enquiries");
        setEnquiries(enqs);

        const { data: refs } = await api.get("/agents/referred-service-providers");
        setReferredProviders(refs);

      } catch (err) {
        console.error(err);
        setMsg("❌ Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    return () => clearInterval(interval);

  }, []);

  // -------------------------------------------------
  // Calculate Earnings
  // -------------------------------------------------
  const totalEarnings = useMemo(() => {
    if (!agent || !properties.length) return 0;
    const commission = agent.commissionPercent || 2;
    return properties.reduce((sum, p) => sum + (p.price || 0) * (commission / 100), 0);
  }, [properties, agent]);

  const handleLogout = () => {
    localStorage.removeItem("agentToken");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <h3>Loading Dashboard...</h3>
      </div>
    );

  return (
    <div style={{ padding: 30 }}>

      {/* ---------------- HEADER ---------------- */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          borderBottom: "1px solid #ddd",
          paddingBottom: 10,
        }}
      >
        <div>
          <h2>Property Dealer Dashboard</h2>
          <p style={{ color: "#666" }}>
            {agent?.name} ({agent?.email})
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: "500",
              color:
                sessionStatus === "active"
                  ? "#16a34a"
                  : sessionStatus === "expired"
                  ? "#dc2626"
                  : "#f59e0b",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background:
                  sessionStatus === "active"
                    ? "#16a34a"
                    : sessionStatus === "expired"
                    ? "#dc2626"
                    : "#f59e0b",
              }}
            ></span>
            {sessionStatus === "active"
              ? "Active"
              : sessionStatus === "expired"
              ? "Expired"
              : "Refreshing..."}
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: "#e74c3c",
              color: "#fff",
              border: "none",
              padding: "8px 14px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* ---------------- PROFILE CARD ---------------- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          background: "linear-gradient(to right, #e0f2fe, #f0f9ff)",
          padding: 20,
          borderRadius: 10,
          marginBottom: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "#1976d2",
              color: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 22,
              fontWeight: "bold",
            }}
          >
            {agent?.name?.charAt(0)?.toUpperCase()}
          </div>

          <div>
            <h3 style={{ margin: 0 }}>{agent?.name}</h3>
            <p style={{ margin: 0 }}>{agent?.email}</p>

            <p style={{ marginTop: 5 }}>
              Agent ID:{" "}
              <b>{agent?._id?.slice(-6).toUpperCase()}</b> |{" "}
              <span
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
              >
                Commission: {agent?.commissionPercent || 2}%
              </span>
            </p>
          </div>
        </div>

        <div>
          <h4 style={{ margin: 0, color: "#047857", fontWeight: "bold" }}>
            ₹ {totalEarnings.toLocaleString("en-IN")}
          </h4>
          <p style={{ margin: 0, fontSize: 14, color: "#555" }}>
            Total Earnings
          </p>
        </div>
      </div>

      {/* ---------------- QUICK ACTIONS ---------------- */}
      <section>
        <h3>Quick Actions</h3>
        <div style={{ display: "flex", gap: 15, marginBottom: 30 }}>
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
      </section>

      {/* ---------------- REFERRED SERVICE PROVIDERS ---------------- */}
      <section style={{ marginTop: 30 }}>
        <h3>Referred Service Providers</h3>

        {referredProviders.length === 0 ? (
          <p style={{ color: "#777" }}>No service providers referred yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 15,
              marginTop: 15,
            }}
          >
            {referredProviders.map((sp) => (
              <div
                key={sp._id}
                style={{
                  background: "#fff",
                  padding: 15,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                <h4 style={{ margin: "0 0 5px" }}>{sp.name}</h4>
                <p style={{ margin: 0, fontSize: 14 }}>{sp.email}</p>

                <p style={{ marginTop: 8, fontSize: 14, color: "#333" }}>
                  <b>Category:</b> {sp.serviceCategory}
                </p>

                <p style={{ fontSize: 13, color: "#444" }}>
                  <b>Joined:</b> {new Date(sp.createdAt).toLocaleDateString()}
                </p>

                <span
                  style={{
                    padding: "3px 8px",
                    fontSize: 13,
                    borderRadius: 6,
                    background: sp.status === "active" ? "#dcfce7" : "#fee2e2",
                    color: sp.status === "active" ? "#166534" : "#b91c1c",
                  }}
                >
                  {sp.status === "active" ? "Active" : "Pending Payment"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
