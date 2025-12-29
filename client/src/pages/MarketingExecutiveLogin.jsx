import React, { useState } from "react";
import api from "../api/api";
import { useNavigate, Link } from "react-router-dom";

export default function MELogin() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
  e.preventDefault();
  setMsg("");

  try {
    const res = await api.post("/marketing-executive/login", form);

    console.log("📊 Marketing Login Response:", res.data); // Debug log

    if (res.data.success && res.data.token && res.data.exec) {
      // Clear all old authentication data first
      localStorage.clear();
      
      // Store marketing executive token
      localStorage.setItem("meToken", res.data.token);
      localStorage.setItem("marketingToken", res.data.token); // For compatibility
      localStorage.setItem("token", res.data.token); // Generic token for AuthContext
      
      // Store user data with proper role identification
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...res.data.exec,
          isMarketing: true,
          role: "marketing-executive",
          userType: "marketing-executive"
        })
      );
      
      // Also store in marketingUser format for AuthContext compatibility
      localStorage.setItem(
        "marketingUser",
        JSON.stringify({
          ...res.data.exec,
          role: "marketing-executive",
          userType: "marketing-executive"
        })
      );
      
      // Store userType separately for easy access
      localStorage.setItem("userType", "marketing-executive");
      
      // Store marketing executive ID
      if (res.data.exec._id) {
        localStorage.setItem("marketingExecutiveId", res.data.exec._id);
      }
      if (res.data.exec.meid) {
        localStorage.setItem("meid", res.data.exec.meid);
      }

      console.log("💾 Marketing Login - Stored Data:", {
        meToken: localStorage.getItem("meToken"),
        marketingToken: localStorage.getItem("marketingToken"),
        userType: localStorage.getItem("userType"),
        user: localStorage.getItem("user"),
        marketingUser: localStorage.getItem("marketingUser"),
        allKeys: Object.keys(localStorage)
      });

      // Force a small delay to ensure localStorage is saved
      setTimeout(() => {
        console.log("🚀 Navigating to marketing dashboard");
        nav("/marketing-executive/dashboard");
        
        // Force page reload to update navbar and auth state
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }, 100);
      
    } else {
      setMsg("❌ Login failed: Invalid response from server");
    }
  } catch (err) {
    console.error("Login Error:", err.response?.data || err.message);
    setMsg("❌ Invalid login details");
  }
}

  return (
    <div style={styles.page}>
      {/* Animations + Responsive */}
      <style>
        {`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes pulseGlow {
            0% { box-shadow: 0 0 10px rgba(0, 200, 255, 0.3); }
            50% { box-shadow: 0 0 20px rgba(0, 200, 255, 0.7); }
            100% { box-shadow: 0 0 10px rgba(0, 200, 255, 0.3); }
          }

          .me-link {
            color: #00d2ff;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
          }

          .me-link:hover {
            text-decoration: underline;
            text-shadow: 0 0 8px rgba(0,210,255,0.8);
          }

          @media(max-width: 650px){
            .meCard {
              width: 90% !important;
              padding: 30px !important;
            }
          }
        `}
      </style>

      {/* -- Login Card -- */}
      <div className="meCard" style={styles.card}>
        <h2 style={styles.title}>Marketing Executive Login</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Email */}
          <div style={styles.inputGroup}>
            <input
              style={styles.input}
              name="email"
              required
              value={form.email}
              onChange={handleChange}
            />
            <label style={styles.label}>Email</label>
          </div>

          {/* Password */}
          <div style={styles.inputGroup}>
            <input
              style={styles.input}
              type="password"
              name="password"
              required
              value={form.password}
              onChange={handleChange}
            />
            <label style={styles.label}>Password</label>
          </div>

          {/* Button */}
          <button type="submit" style={styles.button}>
            Login
          </button>

          {/* ✅ Forgot / Register Links */}
          <div style={styles.links}>
            <Link
              to="/marketing-executive/forgot-password"
              className="me-link"
            >
              Forgot Password?
            </Link>

            <Link
              to="/marketing-executive/register"
              className="me-link"
            >
              New Registration
            </Link>
          </div>
        </form>

        <p style={styles.msg}>{msg}</p>
      </div>
    </div>
  );
}

/* ===================== UNIQUE ME STYLES ===================== */
const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background:
      "linear-gradient(135deg, #001f3f, #003f7f, #006fff)",
    backgroundSize: "300% 300%",
    animation: "gradientShift 10s ease infinite",
  },

  card: {
    width: 420,
    padding: "40px 35px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.12)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,0.22)",
    animation: "slideUp 0.9s ease",
  },

  title: {
    textAlign: "center",
    marginBottom: 30,
    fontSize: 26,
    color: "#fff",
    fontWeight: 800,
    letterSpacing: 1,
    textShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 25,
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
  },

  label: {
    position: "absolute",
    top: 12,
    left: 16,
    fontSize: 15,
    color: "#ddd",
    pointerEvents: "none",
  },

  button: {
    padding: "14px 20px",
    borderRadius: 12,
    fontSize: 17,
    fontWeight: 800,
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(90deg, #00d2ff, #3a7bd5)",
    color: "#001f3f",
    animation: "pulseGlow 2s infinite",
  },

  links: {
    marginTop: 16,
    display: "flex",
    justifyContent: "space-between",
  },

  msg: {
    marginTop: 12,
    textAlign: "center",
    color: "#ffe",
    fontWeight: 600,
  },
};
