import React, { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function MEResister() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [msg, setMsg] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const res = await api.post("/marketing-executive/register", form);
      setMsg("🎉 Registered Successfully!");
      setTimeout(() => nav("/marketing-executive/login"), 1200);
    } catch (err) {
      setMsg("❌ " + (err.response?.data?.error || "Failed"));
    }
  }

  return (
    <div style={styles.page}>
      <style>
        {`
          @keyframes slideFade {
            from { opacity: 0; transform: translateY(35px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes glowPulse {
            0% { box-shadow: 0 0 10px rgba(0,200,255,0.3); }
            50% { box-shadow: 0 0 20px rgba(0,200,255,0.7); }
            100% { box-shadow: 0 0 10px rgba(0,200,255,0.3); }
          }

          @media(max-width: 650px){
            .meRegCard {
              width: 90% !important;
              padding: 35px !important;
            }
          }
        `}
      </style>

      {/* Registration Card */}
      <div className="meRegCard" style={styles.card}>
        <h2 style={styles.title}>Marketing Executive Register</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          
          {/* NAME */}
          <div style={styles.inputGroup}>
            <input
              style={styles.input}
              name="name"
              required
              value={form.name}
              onChange={handleChange}
            />
            <label style={styles.label}>Full Name</label>
          </div>

          {/* EMAIL */}
          <div style={styles.inputGroup}>
            <input
              style={styles.input}
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
            />
            <label style={styles.label}>Email</label>
          </div>

          {/* PHONE */}
          <div style={styles.inputGroup}>
            <input
              style={styles.input}
              name="phone"
              required
              value={form.phone}
              onChange={handleChange}
            />
            <label style={styles.label}>Phone</label>
          </div>

          {/* PASSWORD */}
          <div style={styles.inputGroup}>
            <input
              style={styles.input}
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
            />
            <label style={styles.label}>Password</label>
          </div>

          {/* Button */}
          <button type="submit" style={styles.button}>
            Register
          </button>
        </form>

        <p style={styles.msg}>{msg}</p>
      </div>
    </div>
  );
}

/* ===================== STYLES ===================== */
const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background:
      "linear-gradient(135deg, #001f3f, #003f7f, #007fff)",
    backgroundSize: "300% 300%",
    animation: "gradientShift 10s infinite",
  },

  card: {
    width: 450,
    padding: "45px 40px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.12)",
    backdropFilter: "blur(15px)",
    border: "1px solid rgba(255,255,255,0.25)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
    animation: "slideFade 0.9s ease",
  },

  title: {
    textAlign: "center",
    marginBottom: 30,
    fontSize: 26,
    color: "#fff",
    fontWeight: 800,
    letterSpacing: 1,
    textShadow: "0 4px 15px rgba(0,0,0,0.3)",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 26,
  },

  inputGroup: {
    position: "relative",
  },

  input: {
    width: "100%",
    padding: "14px 16px",
    fontSize: 16,
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 12,
    outline: "none",
    color: "#fff",
    transition: "0.3s",
  },

  label: {
    position: "absolute",
    top: 12,
    left: 16,
    fontSize: 15,
    color: "#ddd",
    transition: "0.3s",
    pointerEvents: "none",
  },

  button: {
    padding: "14px 18px",
    borderRadius: 12,
    fontSize: 17,
    fontWeight: 800,
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(90deg, #00d2ff, #3a7bd5)",
    color: "#001f3f",
    animation: "glowPulse 2.2s infinite",
    transition: "0.3s",
  },

  msg: {
    marginTop: 15,
    textAlign: "center",
    color: "#fff",
    fontWeight: 600,
  },
};
