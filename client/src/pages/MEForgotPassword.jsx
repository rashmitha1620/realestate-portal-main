import React, { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";

export default function MEForgotPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      await api.post("/marketing-executive/forgot-password", { email });
      setMsg("✅ Reset link sent to your email");
      setLoading(false);

      setTimeout(() => {
        nav("/marketing-executive/login");
      }, 2500);
    } catch (err) {
      setMsg(
        err.response?.data?.error || "❌ Unable to process request"
      );
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Forgot Password">
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="Enter registered email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <button style={styles.button} disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        {msg && <p style={styles.msg}>{msg}</p>}
      </form>
    </AuthCard>
  );
}

const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  input: {
    padding: 14,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    outline: "none",
    fontSize: 15,
  },
  button: {
    padding: 14,
    borderRadius: 12,
    fontWeight: 800,
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(90deg,#00d2ff,#3a7bd5)",
    color: "#001f3f",
    transition: "0.3s",
  },
  msg: {
    marginTop: 12,
    textAlign: "center",
    fontWeight: 600,
    color: "#ffe",
  },
};
