import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";

export default function ServiceProviderResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      return setMsg("❌ Password must be at least 6 characters");
    }

    if (password !== confirmPassword) {
      return setMsg("❌ Passwords do not match");
    }

    try {
      setLoading(true);
      setMsg("");

      await api.post(`/service-provider/reset-password/${token}`, { 
        password 
      });

      setMsg("✅ Password reset successful! Redirecting to login...");

      setTimeout(() => nav("/service-provider-login"), 1500);
    } catch (err) {
      setMsg("❌ " + (err.response?.data?.error || "Reset failed. Link may be invalid or expired."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Animated Background Icons */}
      <div style={{ ...styles.floatIcon, top: "15%", left: "10%" }}>🔐</div>
      <div style={{ ...styles.floatIcon, top: "80%", left: "85%" }}>🔄</div>
      <div style={{ ...styles.floatIcon, top: "40%", left: "75%" }}>🔧</div>
      <div style={{ ...styles.floatIcon, top: "60%", left: "15%" }}>⚙️</div>

      <div style={styles.card}>
        <h2 style={styles.title}>Reset Your Password</h2>
        <p style={styles.subtitle}>Enter your new password below</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            placeholder="New Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />

          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
            required
          />

          <button 
            type="submit" 
            disabled={loading} 
            style={styles.button}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          {msg && (
            <p style={{
              ...styles.message,
              color: msg.startsWith("✅") ? "#4ade80" : "#f87171"
            }}>
              {msg}
            </p>
          )}
        </form>

        <p style={styles.footerText}>
          Remember your password?{" "}
          <span 
            onClick={() => nav("/service-provider-login")} 
            style={styles.link}
          >
            Back to Login
          </span>
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Modern Styling - Similar to Login Page
============================================================ */
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #1e3c72, #2a5298)",
    position: "relative",
    overflow: "hidden",
    padding: 20,
    fontFamily: "Inter, sans-serif",
  },

  /* Floating animated icons */
  floatIcon: {
    position: "absolute",
    fontSize: 50,
    opacity: 0.2,
    animation: "float 6s infinite ease-in-out",
  },

  card: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(255, 255, 255, 0.12)",
    backdropFilter: "blur(12px)",
    padding: "35px 30px",
    borderRadius: 16,
    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
    textAlign: "center",
    animation: "fadeIn 0.6s ease",
    zIndex: 10,
  },

  title: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 15,
    color: "#e6e6e6",
    marginBottom: 25,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 15,
    width: "100%",
  },

  input: {
    width: "100%",
    padding: "12px 15px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    fontSize: 15,
    outline: "none",
    transition: "0.3s",
  },

  button: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(90deg, #ff512f, #dd2476)",
    color: "#fff",
    fontSize: 17,
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    marginTop: 10,
    fontWeight: 600,
    transition: "0.25s",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 20px rgba(255, 81, 47, 0.4)",
    },
    "&:disabled": {
      opacity: 0.6,
      cursor: "not-allowed",
      transform: "none",
    },
  },

  message: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: 500,
    minHeight: "20px",
    textAlign: "center",
  },

  footerText: {
    marginTop: 20,
    color: "#e6e6e6",
    fontSize: 14,
  },

  link: {
    color: "#ffd1dc",
    cursor: "pointer",
    textDecoration: "underline",
    transition: "0.2s",
    "&:hover": {
      color: "#fff",
    },
  },
};

/* Keyframes for animations */
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  styleSheet.insertRule(
    `
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-15px); }
      100% { transform: translateY(0px); }
    }`,
    styleSheet.cssRules.length
  );

  styleSheet.insertRule(
    `
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }`,
    styleSheet.cssRules.length
  );
}