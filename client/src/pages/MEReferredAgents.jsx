import React, { useEffect, useState } from "react";
import api from "../api/api";

export default function MarketingExecutiveReferralList() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [me, setMe] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        // 1️⃣ Load logged-in ME details
        const meRes = await api.get("/auth/me");
        setMe(meRes.data);

       const { data } = await api.get("/marketing-executive/my-referred-agents");
setAgents(data.agents);


        setAgents(data.agents || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load referred agents.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading)
    return <div style={styles.loading}>Loading referred agents...</div>;

  if (error)
    return <div style={styles.error}>{error}</div>;

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>👥 Referred Agents</h2>
      <p style={styles.subtitle}>Below is the list of all agents you referred.</p>

      {agents.length === 0 ? (
        <div style={styles.emptyBox}>
          <h3>No Referred Agents Found</h3>
          <p>You haven't referred anyone yet.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {agents.map((a) => (
            <div key={a._id} style={styles.card}>
              <div style={styles.header}>
                <div style={styles.avatar}>{a.name?.charAt(0)}</div>

                <div style={styles.info}>
                  <h3 style={styles.name}>{a.name}</h3>
                  <p style={styles.id}>Agent ID: {a.agentId}</p>
                </div>
              </div>

              <div style={styles.line} />

              <p style={styles.detail}><strong>Email:</strong> {a.email}</p>
              <p style={styles.detail}><strong>Phone:</strong> {a.phone}</p>
              <p style={styles.detail}><strong>Profession:</strong> {a.profession}</p>

              <p style={styles.date}>
                Joined: {new Date(a.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================== STYLES =========================== */
const styles = {
  page: {
    padding: "30px",
  },

  title: {
    fontSize: "28px",
    fontWeight: 800,
    marginBottom: "8px",
  },

  subtitle: {
    color: "#555",
    marginBottom: "20px",
  },

  loading: {
    padding: "40px",
    fontSize: "18px",
    textAlign: "center",
  },

  error: {
    padding: "20px",
    background: "#ffe6e6",
    color: "#c00",
    textAlign: "center",
    borderRadius: "8px",
  },

  emptyBox: {
    padding: "30px",
    background: "#f4f7fb",
    textAlign: "center",
    borderRadius: "10px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
  },

  card: {
    background: "#fff",
    padding: "18px",
    borderRadius: "12px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
    transition: "0.2s",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  avatar: {
    width: "50px",
    height: "50px",
    background: "#4f46e5",
    color: "white",
    borderRadius: "50%",
    fontSize: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  info: {
    flex: 1,
  },

  name: {
    margin: 0,
    fontSize: "20px",
  },

  id: {
    margin: 0,
    fontSize: "13px",
    color: "#666",
  },

  line: {
    width: "100%",
    height: "1px",
    background: "#eee",
    margin: "12px 0",
  },

  detail: {
    margin: "4px 0",
    color: "#444",
  },

  date: {
    marginTop: "10px",
    fontSize: "12px",
    color: "#777",
  },
};
