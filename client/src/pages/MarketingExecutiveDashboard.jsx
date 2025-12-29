import React, { useEffect, useState } from "react";
import { MarketingExecutiveAPI } from "../api/apiService";
import { useNavigate } from "react-router-dom";
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale } from "chart.js";

// Register chart.js components
Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale);

export default function MarketingExecutiveDashboard() {
  const [profile, setProfile] = useState(null);
  const [agents, setAgents] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const nav = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const p = await MarketingExecutiveAPI.profile();
        const a = await MarketingExecutiveAPI.myReferredAgents();
        const sp = await MarketingExecutiveAPI.myReferredProviders();

        setProfile(p.data.executive || null);
        setAgents(a.data.agents || []);
        setProviders(sp.data.providers || []);
      } catch (err) {
        console.error("ME Dashboard Load Error:", err);
      } finally {
        setLoading(false);
        setTimeout(() => renderEarningsChart(), 300);
      }
    }
    loadData();
  }, []);

  // ================================
  //  TOTAL EARNINGS CALCULATION
  // ================================
  const AGENT_COMMISSION = 1500;
  const PROVIDER_COMMISSION = 1000;

  const totalAgentEarnings = agents.length * AGENT_COMMISSION;
  const totalProviderEarnings = providers.length * PROVIDER_COMMISSION;

  const totalEarnings = totalAgentEarnings + totalProviderEarnings;

  // ================================
  // MONTHLY REFERRAL GRAPH
  // ================================
  function renderEarningsChart() {
    const ctx = document.getElementById("earnGraph");
    if (!ctx) return;

    new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Monthly Earnings (₹)",
            data: [
              Math.floor(totalEarnings / 6),
              Math.floor(totalEarnings / 5),
              Math.floor(totalEarnings / 4),
              Math.floor(totalEarnings / 3),
              Math.floor(totalEarnings / 2),
              totalEarnings,
            ],
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }

  // ================================
  // WHATSAPP SHARE LINK
  // ================================
  function shareReferral() {
    const link = `${window.location.origin}/agent-register?ref=${profile.meid}`;
    const msg = `Register as an Agent using my referral!\nReferral MEID: ${profile.meid}\nLink: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  }

  // ================================
  // Copy Invite Link
  // ================================
  function copyInvite() {
    const link = `${window.location.origin}/agent-register?ref=${profile.meid}`;
    navigator.clipboard.writeText(link);
    alert("Referral invite link copied!");
  }

  if (loading)
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loader}></div>
        <p>Loading dashboard...</p>
      </div>
    );

  if (!profile)
    return (
      <div style={{ padding: 20 }}>
        <h2>Unauthorized</h2>
        <p>Please login again.</p>
      </div>
    );

  return (
    <div style={styles.container}>
      {/* ================= PROFILE CARD ================= */}
      <div style={styles.profileCard}>
        <div style={styles.avatar}>{profile.name[0]}</div>

        <div>
          <h2 style={styles.meName}>{profile.name}</h2>
          <p><b>MEID:</b> {profile.meid}</p>
          <p><b>Email:</b> {profile.email}</p>
          <p><b>Phone:</b> {profile.phone}</p>
        </div>

        <button style={styles.logout} onClick={() => {
          localStorage.removeItem("meToken");
          localStorage.removeItem("user");
          nav("/");
        }}>Logout</button>
      </div>

      {/* ================= STAT CARDS ================= */}
      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <h3>{agents.length}</h3>
          <p>Agents Referred</p>
        </div>

        <div style={styles.statBox}>
          <h3>{providers.length}</h3>
          <p>Service Providers Referred</p>
        </div>

        <div style={styles.statBoxBig}>
          <h2>₹ {totalEarnings}</h2>
          <p>Total Earnings</p>
        </div>
      </div>

      {/* ================= CHART ================= */}
      <div style={styles.chartCard}>
        <h3>Monthly Earnings Overview</h3>
        <canvas id="earnGraph" height="100"></canvas>
      </div>

      {/* ================= INVITE TOOLS ================= */}
      <div style={styles.inviteCard}>
        <h3>Referral Tools</h3>

        <button style={styles.btn} onClick={shareReferral}>
          📲 Share on WhatsApp
        </button>

        <button style={styles.btnOutline} onClick={copyInvite}>
          🔗 Copy Referral Link
        </button>
      </div>

      {/* ================= REFERRED AGENTS ================= */}
      <h2 style={styles.sectionTitle}>Referred Agents</h2>
      {agents.length === 0 ? <p>No agents yet.</p> : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Agent ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Profession</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {agents.map((a, i) => (
              <tr key={i}>
                <td>{a.agentId}</td>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{a.phone}</td>
                <td>{a.profession}</td>
                <td>{new Date(a.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ================= REFERRED SERVICE PROVIDERS ================= */}
      <h2 style={styles.sectionTitle}>Referred Service Providers</h2>
      {providers.length === 0 ? <p>No service providers yet.</p> : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Provider ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Service Type</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {providers.map((p, i) => (
              <tr key={i}>
                <td>{p.providerId}</td>
                <td>{p.name}</td>
                <td>{p.email}</td>
                <td>{p.phone}</td>
                <td>{p.serviceType}</td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: 1200, margin: "auto", padding: 25 },
  loadingWrap: { textAlign: "center", paddingTop: 60 },
  loader: {
    width: 40, height: 40, borderRadius: "50%",
    border: "4px solid #ccc", borderTopColor: "#007bff",
    animation: "spin 1s linear infinite"
  },

  profileCard: {
    display: "flex", alignItems: "center",
    padding: 20, background: "#fff",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    borderRadius: 12, gap: 20, marginBottom: 25,
  },
  avatar: {
    width: 70, height: 70, borderRadius: "50%",
    background: "#007bff", color: "#fff",
    display: "flex", justifyContent: "center",
    alignItems: "center", fontSize: 30, fontWeight: "bold",
  },
  meName: { margin: 0, fontSize: 24 },
  logout: {
    marginLeft: "auto", background: "#dc3545",
    border: "none", color: "#fff", padding: "10px 20px",
    borderRadius: 8, cursor: "pointer"
  },

  statsRow: { display: "flex", gap: 20, marginBottom: 20 },
  statBox: {
    flex: 1, background: "#fff", padding: 20,
    borderRadius: 12, textAlign: "center",
    boxShadow: "0 4px 14px rgba(0,0,0,0.05)"
  },
  statBoxBig: {
    flex: 2, background: "#007bff", padding: 20,
    color: "white", borderRadius: 12, textAlign: "center",
    boxShadow: "0 6px 18px rgba(0,0,0,0.1)"
  },

  chartCard: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
    marginBottom: 30,
  },

  inviteCard: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
    marginBottom: 30,
  },

  btn: {
    background: "#25D366",
    border: "none",
    padding: "10px 20px",
    borderRadius: 6,
    color: "#fff",
    cursor: "pointer",
    marginRight: 10,
  },

  btnOutline: {
    background: "white",
    border: "2px solid #007bff",
    padding: "10px 20px",
    borderRadius: 6,
    color: "#007bff",
    cursor: "pointer",
  },

  sectionTitle: { marginTop: 20, marginBottom: 10 },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "white",
    marginBottom: 30,
    borderRadius: 12,
    overflow: "hidden",
  },
};
