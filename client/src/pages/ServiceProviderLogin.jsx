import React, { useState } from "react";
import { ServiceProviderAPI } from "../api/apiService";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import api from "../api/api";


export default function ServiceProviderLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // login | forgot

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

const handleLogin = async (e) => {
  e.preventDefault();
  setMsg("");
  setLoading(true);

  try {
    // 🔥 clear old auth state
    localStorage.clear();
    delete api.defaults.headers.Authorization;

    console.log("🔄 Sending service provider login request for:", email);

    const res = await api.post("/service-provider/login", {
      email: email.toLowerCase().trim(),
      password: password.trim(),
    });

    console.log("✅ Service Provider Login Response:", res.data);
    
    const { token, provider } = res.data;

    if (!token || !provider) {
      console.error("❌ Missing token or provider data:", res.data);
      throw new Error("Invalid login response");
    }

    // ✅ SAVE TOKENS (Multiple formats)
    localStorage.setItem("providerToken", token);
    localStorage.setItem("token", token);
    api.defaults.headers.Authorization = `Bearer ${token}`;

    // ✅ SAVE USER DATA IN MULTIPLE FORMATS
    
    // Format 1: user (with role flags)
    localStorage.setItem(
      "user",
      JSON.stringify({
        ...provider,
        isService: true,
        isAgent: false,
        isAdmin: false,
        isMarketing: false,
        role: "service-provider",
        userType: "service-provider"
      })
    );
    
    // Format 2: providerUser (for AuthContext compatibility)
    localStorage.setItem(
      "providerUser",
      JSON.stringify({
        ...provider,
        role: "service-provider",
        userType: "service-provider"
      })
    );
    
    // Format 3: Store userType separately
    localStorage.setItem("userType", "service-provider");
    
    // Store provider ID separately
    if (provider._id) {
      localStorage.setItem("providerId", provider._id);
    }

    console.log("💾 Service Provider Login - Stored Data:", {
      token: localStorage.getItem("token"),
      providerToken: localStorage.getItem("providerToken"),
      userType: localStorage.getItem("userType"),
      user: localStorage.getItem("user"),
      providerUser: localStorage.getItem("providerUser"),
      allKeys: Object.keys(localStorage)
    });

    console.log("🔑 Service Provider logged in:", {
      id: provider._id,
      name: provider.name,
      email: provider.email,
      subscription: provider.subscription,
    });

    setMsg("✅ Login successful! Redirecting...");
    setLoading(false);

    // Check subscription status
    if (provider.subscription?.active !== true) {
      console.log("⚠️ Subscription inactive, redirecting to renewal");
      nav("/renew", {
        state: {
          userId: provider._id,
          email: provider.email,
          name: provider.name,
          userType: "service-provider",
          subscription: provider.subscription
        }
      });
      return;
    }
    
    // All good - go to dashboard with page reload
    setTimeout(() => {
      window.location.href = "/service-home";
    }, 500);

  } catch (err) {
    setLoading(false);

    // 🔥 HANDLE SUBSCRIPTION EXPIRED
    if (
      err.response?.status === 403 &&
      err.response?.data?.error === "SUBSCRIPTION_EXPIRED"
    ) {
      const data = err.response.data.data;

      // Save renewal context
      localStorage.setItem(
        "renewalContext",
        JSON.stringify(data)
      );

      nav("/renew", {
        state: data,
      });
      return;
    }

    console.error("Service login failed:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    });

    // Handle invalid credentials
    if (err.response?.status === 400 || err.response?.status === 401) {
      setMsg("❌ " + (err.response?.data?.error || "Invalid email or password"));
      return;
    }

    setMsg("❌ Login failed. Please try again.");
  }
};

  const handleForgotPassword = async () => {
    if (!email) {
      setMsg("❌ Please enter your email address");
      return;
    }

    setMsg("");
    setLoading(true);
    
    try {
      await ServiceProviderAPI.forgotPassword({ email });
      setMsg("✅ Password reset link sent to your email");
    } catch (err) {
      setMsg("❌ " + (err.response?.data?.error || "Failed to send reset link"));
    }
    
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      {/* Animated Background Icons */}
      <div style={{ ...styles.floatIcon, top: "20%", left: "12%" }}>🛠️</div>
      <div style={{ ...styles.floatIcon, top: "70%", left: "80%" }}>⚡</div>
      <div style={{ ...styles.floatIcon, top: "50%", left: "60%" }}>🔧</div>

      <div style={styles.card}>
        <h2 style={styles.title}>
          {mode === "login" ? "Service Provider Login" : "Reset Password"}
        </h2>
        <p style={styles.subtitle}>
          {mode === "login" 
            ? "Access your service dashboard" 
            : "Enter your registered email to reset password"}
        </p>

        <form onSubmit={mode === "login" ? handleLogin : (e) => e.preventDefault()} style={{ width: "100%" }}>
          
          {mode === "login" ? (
            <>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                style={styles.input}
                required
                type="email"
                disabled={loading}
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                style={styles.input}
                required
                disabled={loading}
              />

              <button 
                type="submit" 
                disabled={loading} 
                style={{
                  ...styles.button,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? (
                  <>
                    <span style={styles.spinner}></span> Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </button>

              <div style={styles.linksRow}>
                <span 
                  onClick={() => !loading && setMode("forgot")} 
                  style={{
                    ...styles.link,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  Forgot Password?
                </span>

                <Link 
                  to="/service-provider-register" 
                  style={{
                    ...styles.link,
                    pointerEvents: loading ? "none" : "auto",
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  New Registration
                </Link>
              </div>

              {/* Subscription Info */}
              <div style={styles.infoNote}>
                <p style={styles.infoText}>
                  ⓘ A valid subscription is required to access all features.
                </p>
              </div>
            </>
          ) : (
            <>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                style={styles.input}
                required
                type="email"
                disabled={loading}
              />

              <button
                type="button"
                disabled={loading}
                onClick={handleForgotPassword}
                style={{
                  ...styles.button,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? (
                  <>
                    <span style={styles.spinner}></span> Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>

              <span 
                onClick={() => !loading && setMode("login")} 
                style={{
                  ...styles.backLink,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1
                }}
              >
                ← Back to Login
              </span>
            </>
          )}
        </form>

        {msg && (
          <p style={{
            ...styles.message,
            color: msg.includes("✅") ? "#4ade80" : msg.includes("❌") ? "#f87171" : "#fff",
            background: msg.includes("✅") ? "rgba(74, 222, 128, 0.1)" : msg.includes("❌") ? "rgba(248, 113, 113, 0.1)" : "transparent",
            border: msg.includes("✅") ? "1px solid rgba(74, 222, 128, 0.3)" : 
                   msg.includes("❌") ? "1px solid rgba(248, 113, 113, 0.3)" : "none",
            padding: msg.includes("✅") || msg.includes("❌") ? "10px 15px" : "0",
            borderRadius: msg.includes("✅") || msg.includes("❌") ? "8px" : "0"
          }}>
            {msg}
          </p>
        )}

        {/* Debug Info (Development only) */}
        {process.env.NODE_ENV === 'development' && mode === "login" && (
          <div style={styles.debugInfo}>
            <p style={styles.debugText}>
              API: {import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'}
            </p>
            <p style={styles.debugText}>
              Endpoint: /service-provider/login
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Modern Styling
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
    opacity: 0.25,
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

  input: {
    width: "100%",
    padding: "12px 15px",
    margin: "10px 0",
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
    marginTop: 15,
    fontWeight: 600,
    transition: "0.25s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },

  spinner: {
    width: "18px",
    height: "18px",
    border: "3px solid rgba(255, 255, 255, 0.3)",
    borderTop: "3px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  linksRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 15,
  },

  link: {
    color: "#ffd1dc",
    fontSize: 14,
    cursor: "pointer",
    textDecoration: "underline",
    transition: "0.2s",
  },

  backLink: {
    marginTop: 15,
    color: "#fff",
    fontSize: 14,
    cursor: "pointer",
    display: "block",
    textDecoration: "underline",
    transition: "0.2s",
  },

  message: {
    marginTop: 15,
    fontSize: 14,
    fontWeight: 500,
    minHeight: "20px",
  },

  infoNote: {
    marginTop: 15,
    padding: "10px",
    background: "rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },

  infoText: {
    margin: 0,
    fontSize: "12px",
    color: "#e6e6e6",
    lineHeight: "1.4",
  },

  debugInfo: {
    marginTop: "15px",
    padding: "8px",
    background: "rgba(0, 0, 0, 0.2)",
    borderRadius: "6px",
    fontSize: "11px",
    color: "#b3b3b3",
    fontFamily: "monospace",
  },

  debugText: {
    margin: "3px 0",
  },
};

/* Keyframes injected into DOM */
const styleSheet = document.styleSheets[0];
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

styleSheet.insertRule(
  `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`,
  styleSheet.cssRules.length
);

// Add CSS hover effects
styleSheet.insertRule(
  `
input:focus {
  border-color: #ff512f;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 0 2px rgba(255, 81, 47, 0.3);
}`,
  styleSheet.cssRules.length
);

styleSheet.insertRule(
  `
button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 81, 47, 0.4);
}`,
  styleSheet.cssRules.length
);

styleSheet.insertRule(
  `
.link:hover, .backLink:hover {
  color: #ffd1dc;
}`,
  styleSheet.cssRules.length
);