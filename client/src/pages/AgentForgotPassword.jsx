import React, { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function AgentForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await api.post("/agents/forgot-password", { email });
      setMsg("✅ Reset link sent to your email");
      setLoading(false);

      // optional redirect after success
      setTimeout(() => nav("/agent-login"), 2500);
    } catch (err) {
      setMsg("❌ " + (err.response?.data?.error || "Something went wrong"));
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Forgot Password</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            required
            placeholder="Enter registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <button disabled={loading} style={styles.button}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {msg && <p style={styles.msg}>{msg}</p>}
      </div>
    </div>
  );
}

/* ===== styles ===== */
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg,#0c1b33,#1f3a93,#6a89cc)",
    padding: 20,
  },
  card: {
    width: 380,
    padding: 30,
    borderRadius: 16,
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    backdropFilter: "blur(10px)",
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 800,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  input: {
    padding: 14,
    borderRadius: 10,
    border: "none",
    fontSize: 15,
  },
  button: {
    padding: 14,
    borderRadius: 10,
    border: "none",
    fontWeight: 700,
    background: "linear-gradient(90deg,#ffcc00,#ff9900)",
    cursor: "pointer",
  },
  msg: {
    marginTop: 15,
    textAlign: "center",
    fontWeight: 600,
  },
};
