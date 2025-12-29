import React, { useState } from "react";
import api from "../api/api";
import { useNavigate, Link } from "react-router-dom";

export default function AgentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();

  const checkSubscriptionValidity = (subscription) => {
    if (!subscription) return false;
    
    // Check if subscription exists and is active
    const isActive = subscription.active === true || subscription.active === "true";
    if (!isActive) return false;
    
    // Check expiration date
    if (subscription.expiresAt) {
      const expiresAt = new Date(subscription.expiresAt);
      const now = new Date();
      const isExpired = expiresAt < now;
      return !isExpired;
    }
    
    return true;
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (loading) return;
  setMsg("");
  setLoading(true);

  try {
    // Clear old session
    localStorage.clear();
    delete api.defaults.headers.Authorization;

    console.log("🔄 Sending login request for:", email);

    const res = await api.post("/auth/agent-login", {
      email: email.toLowerCase().trim(),
      password: password.trim(),
    });

    console.log("✅ Login response:", res.data);
    console.log("🔍 Response keys:", Object.keys(res.data));

    // Check for token and agent data
    const token = res.data.token;
    const agentData = res.data.agent || res.data.user;
    
    if (!token || !agentData) {
      console.error("❌ Missing token or user data:", {
        hasToken: !!token,
        hasAgent: !!res.data.agent,
        hasUser: !!res.data.user,
        allKeys: Object.keys(res.data)
      });
      setMsg("❌ Invalid server response format");
      setLoading(false);
      return;
    }

    // ✅ SAVE TOKENS (Multiple formats for compatibility)
    localStorage.setItem("token", token);
    localStorage.setItem("agentToken", token);
    api.defaults.headers.Authorization = `Bearer ${token}`;

    // ✅ SAVE USER DATA IN MULTIPLE FORMATS
    
    // Format 1: user (with role flags)
    localStorage.setItem(
      "user",
      JSON.stringify({
        ...agentData,
        isAgent: true,
        isAdmin: false,
        isService: false,
        role: "agent",
        userType: "agent"
      })
    );
    
    // Format 2: agentUser (for AuthContext compatibility)
    localStorage.setItem(
      "agentUser",
      JSON.stringify({
        ...agentData,
        role: "agent",
        userType: "agent"
      })
    );
    
    // Format 3: Store userType separately
    localStorage.setItem("userType", "agent");
    
    // Store agent ID separately
    if (agentData._id) {
      localStorage.setItem("agentId", agentData._id);
    }

    console.log("💾 Agent Login - Stored Data:", {
      token: localStorage.getItem("token"),
      agentToken: localStorage.getItem("agentToken"),
      userType: localStorage.getItem("userType"),
      user: localStorage.getItem("user"),
      agentUser: localStorage.getItem("agentUser"),
      allKeys: Object.keys(localStorage)
    });

    console.log("🔑 Agent logged in:", {
      id: agentData._id,
      name: agentData.name,
      email: agentData.email,
      subscription: agentData.subscription,
    });

    setMsg("✅ Login successful! Redirecting...");
    setLoading(false);

    // ✅ Check subscription (optional)
    if (agentData.subscription?.active !== true) {
      console.log("⚠️ Subscription inactive, redirecting to renewal");
      nav("/renew", {
        state: {
          userId: agentData._id,
          email: agentData.email,
          name: agentData.name,
          userType: "agent",
          subscription: agentData.subscription
        }
      });
      return;
    }
    
    // All good - go to dashboard with page reload
    setTimeout(() => {
      window.location.href = "/agent-dashboard";
    }, 500);

  } catch (err) {
    setLoading(false);
    
    console.error("❌ Login error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    });

    // Handle subscription expired
    if (err.response?.status === 403 && err.response?.data?.error === "SUBSCRIPTION_EXPIRED") {
      nav("/renew", {
        state: err.response.data.data
      });
      return;
    }

    // Handle invalid credentials
    if (err.response?.status === 400 || err.response?.status === 401) {
      setMsg("❌ " + (err.response?.data?.error || "Invalid email or password"));
      return;
    }

    // Handle other errors
    setMsg("❌ Login failed. Please try again.");
  }
};

  return (
    <div style={styles.page}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes pop {
            0% { transform: scale(0.97); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .action-link {
            color: #ffcc00;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
          }

          .action-link:hover {
            text-decoration: underline;
            text-shadow: 0 0 6px rgba(255, 204, 0, 0.6);
          }

          @media(max-width: 600px) {
            .loginCard {
              width: 90% !important;
            }
          }
        `}
      </style>

      <div className="loginCard" style={styles.card}>
        <h2 style={styles.title}>Property Dealer Login</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* EMAIL */}
          <div style={styles.inputGroup}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder=" "
              disabled={loading}
            />
            <label style={styles.label}>Email</label>
          </div>

          {/* PASSWORD */}
          <div style={styles.inputGroup}>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder=" "
              disabled={loading}
            />
            <label style={styles.label}>Password</label>
          </div>

          <button 
            disabled={loading} 
            style={styles.button}
            type="submit"
          >
            {loading ? (
              <>
                <span style={styles.spinner}></span> Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        {/* ✅ Forgot / Register Links */}
        <div style={styles.actionLinks}>
          <Link to="/agent-forgot-password" className="action-link">
            Forgot Password?
          </Link>

          <Link to="/agent-register" className="action-link">
            New Registration
          </Link>
        </div>

        {msg && (
          <div style={{
            ...styles.errorMessage,
            background: msg.includes("❌") ? "rgba(255, 0, 0, 0.1)" : "rgba(0, 255, 0, 0.1)",
            border: msg.includes("❌") ? "1px solid rgba(255, 0, 0, 0.3)" : "1px solid rgba(0, 255, 0, 0.3)"
          }}>
            <p style={{
              ...styles.error,
              color: msg.includes("❌") ? "#ff6b6b" : "#10b981"
            }}>{msg}</p>
          </div>
        )}

        {/* Debug Info (Only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div style={styles.debugInfo}>
            <p style={styles.debugText}>
              Testing with: marripatilokesh237@gmail.com
            </p>
            <p style={styles.debugText}>
              Response format: token + user (not agent)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== STYLES ===================== */
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0c1b33, #1f3a93, #6a89cc)",
    padding: 20,
  },

  card: {
    width: 400,
    padding: "35px 30px",
    borderRadius: 20,
    background: "rgba(255, 255, 255, 0.15)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
    color: "#fff",
    animation: "fadeIn 0.9s ease-out",
    position: "relative",
  },

  title: {
    textAlign: "center",
    marginBottom: 25,
    fontSize: 28,
    fontWeight: 800,
    color: "#fff",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 22,
  },

  inputGroup: {
    position: "relative",
  },

  label: {
    position: "absolute",
    left: 15,
    top: 12,
    color: "#ddd",
    fontSize: 15,
    pointerEvents: "none",
    transition: "all 0.3s ease",
  },

  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 10,
    border: "none",
    outline: "none",
    fontSize: 16,
    color: "#fff",
    background: "rgba(255,255,255,0.12)",
    transition: "all 0.3s ease",
  },

  button: {
    background: "linear-gradient(90deg, #ffcc00, #ff9900)",
    border: "none",
    padding: "14px 20px",
    borderRadius: 12,
    color: "#222",
    fontWeight: 800,
    fontSize: 16,
    cursor: "pointer",
    marginTop: 10,
    animation: "pop 0.4s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all 0.3s ease",
  },

  spinner: {
    width: "18px",
    height: "18px",
    border: "3px solid rgba(34, 34, 34, 0.3)",
    borderTop: "3px solid #222",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  actionLinks: {
    marginTop: 18,
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
  },

  errorMessage: {
    marginTop: 15,
    padding: "12px 15px",
    borderRadius: 10,
  },

  error: {
    margin: 0,
    textAlign: "center",
    fontWeight: 600,
    fontSize: "14px",
  },

  debugInfo: {
    marginTop: 15,
    padding: "10px",
    background: "rgba(0,0,0,0.2)",
    borderRadius: "8px",
    fontSize: "12px",
  },

  debugText: {
    margin: "5px 0",
    color: "#ddd",
    fontFamily: "monospace",
  },
};

// Add CSS for input focus effects
const styleTag = document.createElement('style');
styleTag.innerHTML = `
  .loginCard input:focus + label,
  .loginCard input:not(:placeholder-shown) + label {
    top: -20px;
    left: 10px;
    font-size: 12px;
    color: #ffcc00;
  }
  
  .loginCard input:focus {
    background: rgba(255, 255, 255, 0.18);
    box-shadow: 0 0 0 2px rgba(255, 204, 0, 0.3);
  }
  
  .loginCard button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(255, 204, 0, 0.3);
  }
  
  .loginCard button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .loginCard input:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;
document.head.appendChild(styleTag);