import React, { useState, useEffect } from "react";
import api from "../api/api";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [particles, setParticles] = useState([]);

  // Create floating particles
  useEffect(() => {
    const createParticles = () => {
      const particleArray = [];
      for (let i = 0; i < 20; i++) {
        particleArray.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 4 + 2,
          speed: Math.random() * 0.5 + 0.2,
          opacity: Math.random() * 0.5 + 0.2,
          blur: Math.random() * 10 + 5,
        });
      }
      setParticles(particleArray);
    };
    createParticles();
  }, []);

  // Floating particles animation
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: (p.y + p.speed) % 100,
        x: (p.x + Math.sin(p.y * 0.1) * 0.3) % 100,
      })));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await api.post("/auth/admin-login", { email, password });

      // ⭐ MUST clear all previous tokens
      localStorage.removeItem("agentToken");
      localStorage.removeItem("providerToken");
      localStorage.removeItem("meToken");
      localStorage.removeItem("user");

      // ⭐ SAVE ADMIN TOKEN (CORRECT KEY)
      localStorage.setItem("adminToken", res.data.token);

      // save user
      localStorage.setItem("user", JSON.stringify({
        ...res.data.user,
        isAdmin: true,
      }));

      // Success animation
      setMsg("✨ Access Granted! Redirecting...");
      
      // Add success particle effect
      setTimeout(() => {
        window.location.href = "/admin-dashboard";
      }, 1200);

    } catch (err) {
      setMsg("🔒 " + (err.response?.data?.error || "Access Denied"));
      
      // Shake animation on error
      const card = document.querySelector('.admin-card');
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 500);
      
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Animated Background */}
      <div style={styles.background}>
        {/* Floating Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              ...styles.particle,
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              filter: `blur(${p.blur}px)`,
              animationDelay: `${p.id * 0.1}s`,
            }}
          />
        ))}
        
        {/* Geometric Pattern */}
        <div style={styles.geometric1}></div>
        <div style={styles.geometric2}></div>
        <div style={styles.geometric3}></div>
        
        {/* Glowing Orbs */}
        <div style={styles.glowOrb1}></div>
        <div style={styles.glowOrb2}></div>
      </div>

      {/* Main Card */}
      <div className="admin-card" style={styles.card}>
        {/* Admin Crown Icon with Animation */}
        <div style={styles.crownContainer}>
          <div style={styles.crown}>👑</div>
          <div style={styles.crownGlow}></div>
        </div>

        {/* Header */}
        <h2 style={styles.title}>
          Admin<span style={styles.titleHighlight}>Portal</span>
        </h2>
        <p style={styles.subtitle}>
          Secure access to management dashboard
          <span style={styles.subtitleLine}></span>
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Email Input */}
          <div style={styles.inputContainer}>
            <div style={styles.inputIcon}>📧</div>
            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
            <div style={styles.inputLine}></div>
          </div>

          {/* Password Input */}
          <div style={styles.inputContainer}>
            <div style={styles.inputIcon}>🔒</div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
            <div style={styles.inputLine}></div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading && styles.buttonLoading),
            }}
          >
            {loading ? (
              <>
                <div style={styles.spinner}></div>
                Authenticating...
              </>
            ) : (
              "Enter Admin Dashboard"
            )}
          </button>

          {/* Message Display */}
          {msg && (
            <div style={{
              ...styles.message,
              ...(msg.includes("Granted") ? styles.messageSuccess : styles.messageError),
            }}>
              {msg}
              {msg.includes("Granted") && (
                <div style={styles.successSparkles}>✨✨✨</div>
              )}
            </div>
          )}

          {/* Security Note */}
          <div style={styles.securityNote}>
            <div style={styles.securityIcon}>🛡️</div>
            <span>This portal is monitored and secured</span>
          </div>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerLine}></div>
          <p style={styles.footerText}>
            Restricted Access • Authorized Personnel Only
          </p>
        </div>
      </div>

      {/* Add CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    position: "relative",
    overflow: "hidden",
    padding: "20px",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  
  background: {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    zIndex: 0,
  },
  
  particle: {
    position: "absolute",
    background: "linear-gradient(45deg, #ff00ff, #00ffff)",
    borderRadius: "50%",
    animation: "float 3s infinite ease-in-out",
  },
  
  geometric1: {
    position: "absolute",
    top: "10%",
    right: "15%",
    width: "200px",
    height: "200px",
    border: "2px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
    transform: "rotate(45deg)",
    animation: "spin 20s linear infinite",
  },
  
  geometric2: {
    position: "absolute",
    bottom: "10%",
    left: "10%",
    width: "150px",
    height: "150px",
    border: "2px solid rgba(255, 255, 255, 0.03)",
    borderRadius: "50%",
    transform: "rotate(0deg)",
    animation: "spin 15s linear infinite reverse",
  },
  
  geometric3: {
    position: "absolute",
    top: "50%",
    left: "5%",
    width: "100px",
    height: "100px",
    border: "1px solid rgba(255, 255, 255, 0.02)",
    borderRadius: "40%",
    transform: "rotate(15deg)",
    animation: "spin 25s linear infinite",
  },
  
  glowOrb1: {
    position: "absolute",
    top: "20%",
    left: "20%",
    width: "300px",
    height: "300px",
    background: "radial-gradient(circle, rgba(120, 119, 198, 0.15) 0%, transparent 70%)",
    borderRadius: "50%",
    animation: "glow 4s ease-in-out infinite",
  },
  
  glowOrb2: {
    position: "absolute",
    bottom: "20%",
    right: "20%",
    width: "250px",
    height: "250px",
    background: "radial-gradient(circle, rgba(198, 119, 198, 0.1) 0%, transparent 70%)",
    borderRadius: "50%",
    animation: "glow 5s ease-in-out infinite reverse",
  },
  
  card: {
    background: "rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(15px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "24px",
    padding: "40px",
    width: "100%",
    maxWidth: "440px",
    position: "relative",
    zIndex: 1,
    boxShadow: `
      0 20px 40px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 0 0 1px rgba(255, 255, 255, 0.05)
    `,
    animation: "fadeIn 0.8s ease-out",
  },
  
  crownContainer: {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    marginBottom: "20px",
  },
  
  crown: {
    fontSize: "48px",
    filter: "drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))",
    animation: "float 3s infinite ease-in-out",
    position: "relative",
    zIndex: 2,
  },
  
  crownGlow: {
    position: "absolute",
    width: "80px",
    height: "80px",
    background: "radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)",
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    animation: "pulse 2s infinite",
  },
  
  title: {
    color: "#fff",
    fontSize: "36px",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: "8px",
    letterSpacing: "-0.5px",
    background: "linear-gradient(45deg, #fff, #a8edea)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  
  titleHighlight: {
    color: "#ffd700",
    marginLeft: "8px",
  },
  
  subtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: "14px",
    textAlign: "center",
    marginBottom: "32px",
    position: "relative",
    letterSpacing: "1px",
  },
  
  subtitleLine: {
    position: "absolute",
    bottom: "-8px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "60px",
    height: "2px",
    background: "linear-gradient(90deg, transparent, #ffd700, transparent)",
  },
  
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  
  inputContainer: {
    position: "relative",
  },
  
  inputIcon: {
    position: "absolute",
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "18px",
    color: "rgba(255, 255, 255, 0.6)",
    zIndex: 1,
  },
  
  input: {
    width: "100%",
    padding: "16px 16px 16px 48px",
    background: "rgba(255, 255, 255, 0.07)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "15px",
    outline: "none",
    transition: "all 0.3s ease",
    backdropFilter: "blur(10px)",
    boxSizing: "border-box",
  },
  
  inputLine: {
    position: "absolute",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%) scaleX(0)",
    width: "100%",
    height: "2px",
    background: "linear-gradient(90deg, transparent, #ffd700, transparent)",
    transition: "transform 0.3s ease",
  },
  
  button: {
    background: "linear-gradient(45deg, #8a2387, #f27121, #e94057)",
    backgroundSize: "200% 200%",
    color: "#fff",
    border: "none",
    padding: "18px",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all 0.3s ease",
    marginTop: "10px",
    position: "relative",
    overflow: "hidden",
  },
  
  buttonLoading: {
    opacity: 0.9,
    cursor: "not-allowed",
    animation: "shimmer 2s infinite linear",
  },
  
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  
  message: {
    padding: "16px",
    borderRadius: "12px",
    textAlign: "center",
    fontSize: "14px",
    fontWeight: "500",
    marginTop: "16px",
    position: "relative",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
    animation: "fadeIn 0.5s ease-out",
  },
  
  messageSuccess: {
    background: "rgba(46, 204, 113, 0.15)",
    border: "1px solid rgba(46, 204, 113, 0.3)",
    color: "#2ecc71",
  },
  
  messageError: {
    background: "rgba(231, 76, 60, 0.15)",
    border: "1px solid rgba(231, 76, 60, 0.3)",
    color: "#e74c3c",
  },
  
  successSparkles: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "24px",
    animation: "sparkle 1s ease-in-out",
  },
  
  securityNote: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: "12px",
    marginTop: "8px",
  },
  
  securityIcon: {
    animation: "pulse 3s infinite",
  },
  
  footer: {
    marginTop: "32px",
    textAlign: "center",
  },
  
  footerLine: {
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)",
    marginBottom: "12px",
  },
  
  footerText: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: "11px",
    letterSpacing: "1px",
    fontFamily: "monospace",
  },
};

// Add additional keyframes
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`, styleSheet.cssRules.length);