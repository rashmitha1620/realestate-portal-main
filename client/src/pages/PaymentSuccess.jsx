// client/src/pages/PaymentSuccess.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Verifying payment...");
  const [userType, setUserType] = useState(null);
  const [userData, setUserData] = useState(null);
  const [progress, setProgress] = useState(0);

  // Progress animation
  useEffect(() => {
    if (status === "processing") {
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 3, 90));
      }, 200);
      return () => clearInterval(interval);
    }
  }, [status]);

  useEffect(() => {
    const orderId = params.get("order_id");
    const tempId = params.get("tempId");
    
    console.log("URL Parameters:", { orderId, tempId });

    if (!orderId || !tempId) {
      setStatus("failed");
      setMessage("❌ Missing payment information. Please contact support.");
      return;
    }

    const detectedType = orderId.startsWith("SP_") ? "provider" : "agent";
    setUserType(detectedType);
    
    async function verifyAndFinalize() {
      try {
        const storageKeys = {
          agent: {
            tempKey: "agentTempId",
            orderKey: "agentOrderId",
            voterKey: "agentVoterId",
            loginPath: "/agent-login",
            registerPath: "/agent-register"
          },
          provider: {
            tempKey: "providerTempId",
            orderKey: "providerOrderId",
            voterKey: "providerVoterId",
            loginPath: "/service-provider-login",
            registerPath: "/service-provider-register"
          }
        };

        const keys = storageKeys[detectedType];
        const voterIdBase64 = sessionStorage.getItem(keys.voterKey);
        
        const endpoint = detectedType === "agent" 
          ? "/payments/agent/verify" 
          : "/payments/service-provider/verify";

        const payload = {
          tempId,
          cashfree_order_id: orderId
        };
        
        if (detectedType === "agent" && voterIdBase64) {
          payload.voterIdBase64 = voterIdBase64;
        }

        const response = await api.post(endpoint, payload);
        
        if (response.data.success) {
          if (response.data.existing) {
            setStatus("existing");
            setMessage(`✅ Account already exists. Please login.`);
            setUserData(response.data);
            setProgress(100);
          } else {
            setStatus("success");
            setMessage(`🎉 Payment successful! Your ${detectedType} account is now active.`);
            setUserData(response.data);
            setProgress(100);
            
            setTimeout(() => {
              sessionStorage.removeItem(keys.tempKey);
              sessionStorage.removeItem(keys.orderKey);
              if (keys.voterKey) sessionStorage.removeItem(keys.voterKey);
              navigate(keys.loginPath);
            }, 5000);
          }
        } else {
          throw new Error(response.data.error || "Verification failed");
        }
      } catch (err) {
        console.error("Verification error:", err);
        let errorMessage = err.response?.data?.error || err.message;
        
        if (errorMessage.includes("Payment pending") || errorMessage.includes("pending")) {
          setStatus("pending");
          setMessage("⏳ Payment is still processing. Please wait a moment and refresh.");
        } else if (errorMessage.includes("Session expired") || errorMessage.includes("expired")) {
          setStatus("expired");
          setMessage("⚠️ Registration session expired. Please restart registration.");
        } else if (errorMessage.includes("already exists") || errorMessage.includes("already registered")) {
          setStatus("existing");
          setMessage("✅ Account already exists. Please login instead.");
        } else {
          setStatus("failed");
          setMessage(`❌ ${errorMessage}`);
        }
        setProgress(100);
      }
    }

    const timer = setTimeout(() => {
      verifyAndFinalize();
    }, 800);
    return () => clearTimeout(timer);
  }, [navigate, params]);

  // Advanced inline styles with animations
  const getUserStyles = () => {
    const colors = {
      agent: {
        primary: "#3498db",
        gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        light: "rgba(52, 152, 219, 0.1)",
        success: "#10b981",
        badge: "linear-gradient(135deg, #3498db, #2ecc71)"
      },
      provider: {
        primary: "#9c27b0",
        gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        light: "rgba(156, 39, 176, 0.1)",
        success: "#8e24aa",
        badge: "linear-gradient(135deg, #9c27b0, #673ab7)"
      },
      unknown: {
        primary: "#666",
        gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        light: "rgba(102, 102, 102, 0.1)",
        success: "#666",
        badge: "linear-gradient(135deg, #666, #999)"
      }
    };
    
    const colorSet = colors[userType] || colors.unknown;
    
    return {
      container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden"
      },
      backgroundOrbs: {
        position: "absolute",
        width: "300px",
        height: "300px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
        filter: "blur(40px)",
        animation: "float 20s ease-in-out infinite"
      },
      orb1: {
        top: "-100px",
        right: "-100px",
        background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)"
      },
      orb2: {
        bottom: "-150px",
        left: "-100px",
        background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
        animationDelay: "10s"
      },
      card: {
        width: "100%",
        maxWidth: "480px",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderRadius: "24px",
        padding: "40px",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        position: "relative",
        zIndex: 10,
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.2)"
      },
      cardGlow: {
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        height: "4px",
        background: colorSet.gradient,
        animation: "glowPulse 3s ease-in-out infinite"
      },
      spinner: {
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        position: "relative",
        margin: "30px auto",
        background: "conic-gradient(transparent 0deg, " + colorSet.primary + " 360deg)",
        animation: "spin 1.2s linear infinite",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      },
      spinnerInner: {
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        background: "white"
      },
      progressBar: {
        width: "100%",
        height: "6px",
        background: "rgba(0, 0, 0, 0.1)",
        borderRadius: "3px",
        margin: "30px 0",
        overflow: "hidden",
        position: "relative"
      },
      progressFill: {
        width: `${progress}%`,
        height: "100%",
        background: colorSet.gradient,
        borderRadius: "3px",
        transition: "width 0.5s ease-out",
        position: "relative",
        overflow: "hidden"
      },
      progressShine: {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100px",
        height: "100%",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
        animation: "shimmer 2s infinite"
      },
      successIcon: {
        fontSize: "80px",
        margin: "20px auto",
        background: colorSet.gradient,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        animation: "bounce 1s ease infinite alternate"
      },
      userBadge: {
        display: "inline-block",
        padding: "8px 20px",
        background: colorSet.badge,
        color: "white",
        borderRadius: "50px",
        fontSize: "14px",
        fontWeight: "600",
        letterSpacing: "0.5px",
        marginBottom: "20px",
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.3)"
      },
      title: {
        fontSize: "28px",
        fontWeight: "700",
        color: "#1a202c",
        marginBottom: "15px",
        background: colorSet.gradient,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      },
      subtitle: {
        fontSize: "16px",
        color: "#4a5568",
        lineHeight: "1.6",
        marginBottom: "25px"
      },
      detailsCard: {
        background: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(240,242,245,0.9))",
        padding: "25px",
        borderRadius: "16px",
        margin: "25px 0",
        border: "1px solid rgba(255, 255, 255, 0.4)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        backdropFilter: "blur(10px)"
      },
      detailItem: {
        display: "flex",
        justifyContent: "space-between",
        padding: "12px 0",
        borderBottom: "1px solid rgba(0, 0, 0, 0.05)"
      },
      detailLabel: {
        color: "#4a5568",
        fontWeight: "500"
      },
      detailValue: {
        color: "#1a202c",
        fontWeight: "600"
      },
      button: {
        padding: "16px 32px",
        borderRadius: "12px",
        border: "none",
        fontSize: "16px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        minWidth: "160px",
        position: "relative",
        overflow: "hidden",
        margin: "10px"
      },
      primaryButton: {
        background: colorSet.gradient,
        color: "white",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)"
      },
      secondaryButton: {
        background: "rgba(255, 255, 255, 0.9)",
        color: colorSet.primary,
        border: "2px solid " + colorSet.primary
      },
      dangerButton: {
        background: "linear-gradient(135deg, #ff416c, #ff4b2b)",
        color: "white",
        boxShadow: "0 10px 25px rgba(255, 75, 43, 0.3)"
      },
      buttonHover: {
        transform: "translateY(-3px)",
        boxShadow: "0 15px 35px rgba(0, 0, 0, 0.3)"
      },
      buttonActive: {
        transform: "translateY(-1px)"
      },
      buttonRipple: {
        position: "absolute",
        borderRadius: "50%",
        background: "rgba(255, 255, 255, 0.5)",
        transform: "scale(0)",
        animation: "ripple 0.6s linear"
      },
      countdown: {
        fontSize: "14px",
        color: "#718096",
        marginTop: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px"
      },
      countdownCircle: {
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        background: colorSet.light,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "600",
        color: colorSet.primary,
        animation: "pulse 2s infinite"
      },
      statusIndicator: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 20px",
        borderRadius: "12px",
        background: "rgba(255, 255, 255, 0.9)",
        marginBottom: "25px",
        borderLeft: "4px solid " + colorSet.primary
      },
      statusDot: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        background: status === "processing" ? "#f59e0b" : 
                   status === "success" ? "#10b981" : 
                   status === "failed" ? "#ef4444" : "#6b7280",
        animation: status === "processing" ? "pulse 1.5s infinite" : "none"
      }
    };
  };

  const styles = getUserStyles();
  const paths = {
    loginPath: userType === "agent" ? "/agent-login" : "/service-provider-login",
    registerPath: userType === "agent" ? "/agent-register" : "/service-provider-register",
    homePath: "/"
  };

  // Add keyframes to document
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes float {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        33% { transform: translate(30px, -30px) rotate(120deg); }
        66% { transform: translate(-20px, 20px) rotate(240deg); }
      }
      @keyframes glowPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }
      @keyframes bounce {
        0% { transform: translateY(0); }
        100% { transform: translateY(-20px); }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
      }
      @keyframes ripple {
        to { transform: scale(4); opacity: 0; }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleButtonClick = (action) => {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      Object.assign(ripple.style, styles.buttonRipple);
      ripple.style.left = `${rect.width/2}px`;
      ripple.style.top = `${rect.height/2}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
    
    if (action === 'login') {
      const keysToRemove = [
        "agentTempId", "agentOrderId", "agentVoterId",
        "providerTempId", "providerOrderId", "providerVoterId"
      ];
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      navigate(paths.loginPath);
    } else if (action === 'restart') {
      const keysToRemove = userType === "agent" 
        ? ["agentTempId", "agentOrderId", "agentVoterId"]
        : ["providerTempId", "providerOrderId", "providerVoterId"];
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      navigate(paths.registerPath);
    } else if (action === 'home') {
      navigate(paths.homePath);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background orbs */}
      <div style={{...styles.backgroundOrbs, ...styles.orb1}}></div>
      <div style={{...styles.backgroundOrbs, ...styles.orb2}}></div>
      
      {/* Main card */}
      <div style={styles.card}>
        <div style={styles.cardGlow}></div>
        
        {/* Status indicator */}
        <div style={styles.statusIndicator}>
          <div style={styles.statusDot}></div>
          <div style={{ fontWeight: "600", color: "#4a5568" }}>
            {status === "processing" ? "Processing..." : 
             status === "success" ? "Completed" : 
             status === "failed" ? "Failed" : "Verification"}
          </div>
        </div>

        {/* User type badge */}
        {userType && (
          <div style={styles.userBadge}>
            {userType === "agent" ? "🏢 Real Estate Agent" : "🔧 Service Provider"}
          </div>
        )}

        {status === "processing" && (
          <div style={{ animation: "fadeInUp 0.5s ease-out" }}>
            <div style={styles.spinner}>
              <div style={styles.spinnerInner}></div>
            </div>
            <h2 style={styles.title}>Processing Your Payment</h2>
            <p style={styles.subtitle}>
              We're verifying your payment and setting up your account. 
              This usually takes just a few moments.
            </p>
            
            <div style={styles.progressBar}>
              <div style={styles.progressFill}>
                <div style={styles.progressShine}></div>
              </div>
            </div>
            
            <div style={styles.countdown}>
              <div style={styles.countdownCircle}>{Math.round(progress)}%</div>
              <span>Processing payment verification...</span>
            </div>
          </div>
        )}

        {status === "success" && (
          <div style={{ animation: "fadeInUp 0.5s ease-out" }}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.title}>Registration Complete!</h2>
            <p style={styles.subtitle}>{message}</p>
            
            {userData && (
              <div style={styles.detailsCard}>
                {userData.agentId && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Agent ID:</span>
                    <span style={styles.detailValue}>{userData.agentId}</span>
                  </div>
                )}
                {userData.providerId && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Provider ID:</span>
                    <span style={styles.detailValue}>{userData.providerId}</span>
                  </div>
                )}
                {userData.email && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Email:</span>
                    <span style={styles.detailValue}>{userData.email}</span>
                  </div>
                )}
                {userData.name && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Name:</span>
                    <span style={styles.detailValue}>{userData.name}</span>
                  </div>
                )}
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "center", marginTop: "30px" }}>
              <button
                style={{...styles.button, ...styles.primaryButton}}
                onClick={() => handleButtonClick('login')}
                onMouseOver={e => Object.assign(e.currentTarget.style, styles.buttonHover)}
                onMouseOut={e => Object.assign(e.currentTarget.style, {...styles.button, ...styles.primaryButton})}
              >
                🚀 Go to Dashboard
              </button>
            </div>
            
            <div style={styles.countdown}>
              <div style={styles.countdownCircle}>5</div>
              <span>Redirecting automatically in 5 seconds...</span>
            </div>
          </div>
        )}

        {status === "existing" && (
          <div style={{ animation: "fadeInUp 0.5s ease-out" }}>
            <div style={{...styles.successIcon, fontSize: "60px"}}>ℹ️</div>
            <h2 style={styles.title}>Account Already Active</h2>
            <p style={styles.subtitle}>{message}</p>
            
            <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "30px" }}>
              <button
                style={{...styles.button, ...styles.primaryButton}}
                onClick={() => handleButtonClick('login')}
              >
                🔐 Login to Account
              </button>
              <button
                style={{...styles.button, ...styles.secondaryButton}}
                onClick={() => navigate(paths.homePath)}
              >
                🏠 Go Home
              </button>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div style={{ animation: "fadeInUp 0.5s ease-out" }}>
            <div style={{...styles.successIcon, fontSize: "60px", animation: "none"}}>❌</div>
            <h2 style={{...styles.title, background: "linear-gradient(135deg, #ff416c, #ff4b2b)"}}>
              Verification Failed
            </h2>
            <p style={styles.subtitle}>{message}</p>
            
            <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "30px", flexWrap: "wrap" }}>
              <button
                style={{...styles.button, ...styles.dangerButton}}
                onClick={() => handleButtonClick('restart')}
              >
                🔄 Restart Registration
              </button>
              <button
                style={{...styles.button, ...styles.primaryButton}}
                onClick={() => window.location.reload()}
              >
                🔃 Try Again
              </button>
              <button
                style={{...styles.button, ...styles.secondaryButton}}
                onClick={() => handleButtonClick('home')}
              >
                🏠 Go Home
              </button>
            </div>
          </div>
        )}

        {status === "pending" && (
          <div style={{ animation: "fadeInUp 0.5s ease-out" }}>
            <div style={{...styles.successIcon, fontSize: "60px", animation: "pulse 1.5s infinite"}}>⏳</div>
            <h2 style={styles.title}>Payment Processing</h2>
            <p style={styles.subtitle}>{message}</p>
            <p style={{...styles.subtitle, fontSize: "14px", color: "#718096"}}>
              Sometimes payments take a few minutes to process. You can safely close this page 
              and check your email for confirmation.
            </p>
            
            <div style={{ display: "flex", justifyContent: "center", marginTop: "30px" }}>
              <button
                style={{...styles.button, ...styles.primaryButton}}
                onClick={() => window.location.reload()}
              >
                🔄 Refresh Status
              </button>
            </div>
          </div>
        )}

        {status === "expired" && (
          <div style={{ animation: "fadeInUp 0.5s ease-out" }}>
            <div style={{...styles.successIcon, fontSize: "60px", animation: "pulse 1.5s infinite"}}>⏰</div>
            <h2 style={styles.title}>Session Expired</h2>
            <p style={styles.subtitle}>{message}</p>
            
            <div style={{ display: "flex", justifyContent: "center", marginTop: "30px" }}>
              <button
                style={{...styles.button, ...styles.primaryButton}}
                onClick={() => handleButtonClick('restart')}
              >
                🔄 Start New Registration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}