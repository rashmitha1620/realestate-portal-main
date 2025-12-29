import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";

export default function MarketingResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      return setMsg("Password must be at least 6 characters");
    }

    if (password !== confirm) {
      return setMsg("Passwords do not match");
    }

    try {
      setLoading(true);

      await api.post(
        `/marketing-executive/reset-password/${token}`,
        { password }
      );
      setMsg("✅ Password reset successful");

      setTimeout(() => nav("/marketing-executive/login"), 1500);

    } catch (err) {
      setMsg(err.response?.data?.error || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Marketing Executive – Reset Password</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={styles.input}
        />

        <button disabled={loading} style={styles.btn}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>

        {msg && <p style={styles.msg}>{msg}</p>}
      </form>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 420,
    margin: "80px auto",
    padding: 22,
    border: "1px solid #eee",
    borderRadius: 10,
    textAlign: "center",
  },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
  },
  btn: {
    padding: 10,
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  msg: { marginTop: 10 },
};
