import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

export default function AgentDetails() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const id = user?._id;
  const token = localStorage.getItem("agentToken");

  const [agent, setAgent] = useState(null);
  const [properties, setProperties] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [renewing, setRenewing] = useState(false);
  const [subscriptionMsg, setSubscriptionMsg] = useState("");
  const [showRenewConfirm, setShowRenewConfirm] = useState(false);

  // Function to check subscription status
  const checkSubscriptionStatus = (subscription) => {
    if (!subscription) {
      return {
        active: false,
        status: "No Subscription",
        color: "#dc2626",
        icon: "❌",
        message: "No subscription found",
        daysRemaining: 0,
        expiresAt: null,
        canRenew: true,
        renewLabel: "Subscribe Now",
        showRenewEarly: false
      };
    }

    const now = new Date();
    
    // Calculate expiresAt if missing but paidAt exists
    let expiresAt = null;
    if (subscription.expiresAt) {
      expiresAt = new Date(subscription.expiresAt);
    } else if (subscription.paidAt) {
      // If expiresAt is missing but paidAt exists, calculate it
      const paidAt = new Date(subscription.paidAt);
      expiresAt = new Date(paidAt);
      expiresAt.setMonth(expiresAt.getMonth() + 1); // Add 30 days
    }
    
    // Check if subscription is active
    const isActive = subscription.active === true || subscription.active === "true";
    
    let daysRemaining = 0;
    if (expiresAt && expiresAt > now) {
      daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    }

    // Updated validation logic
    const hasValidPayment = subscription.paidAt && subscription.paidAt !== "null";
    const isNotExpired = expiresAt && expiresAt > now;
    const isValid = (isActive || hasValidPayment) && isNotExpired;
    
    if (!isValid) {
      return {
        active: false,
        status: "Expired",
        color: "#dc2626",
        icon: "❌",
        message: "Subscription has expired",
        daysRemaining: 0,
        expiresAt: expiresAt,
        canRenew: true,
        renewLabel: "Renew Subscription",
        showRenewEarly: false,
        isExpired: true
      };
    }

    if (daysRemaining <= 7) {
      return {
        active: true,
        status: "Expiring Soon",
        color: "#f59e0b",
        icon: "⚠️",
        message: `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
        daysRemaining: daysRemaining,
        expiresAt: expiresAt,
        canRenew: true,
        renewLabel: "Renew Now",
        showRenewEarly: false,
        isExpiringSoon: true
      };
    }

    // Active subscription - CAN STILL RENEW EARLY
    return {
      active: true,
      status: "Active",
      color: "#16a34a",
      icon: "✅",
      message: `Valid for ${daysRemaining} more day${daysRemaining !== 1 ? 's' : ''}`,
      daysRemaining: daysRemaining,
      expiresAt: expiresAt,
      canRenew: true, // CHANGED: Always allow renewal
      renewLabel: "Renew Early", // CHANGED: Label for early renewal
      showRenewEarly: true, // CHANGED: Show early renewal option
      isActive: true
    };
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchAgentData() {
      if (!isMounted) return;

      try {
        setLoading(true);
        setError(null);

        // ✅ Validate and normalize agent ID
        function validateAgentId(agentId) {
          if (!agentId || agentId === "undefined" || agentId === "null") {
            return "me"; // Default to current user
          }
          return agentId;
        }
        
        const agentId = validateAgentId(id);
        
        // ✅ Fetch agent data
        const agentResponse = await api.get(`/agents/${agentId}`);
        if (!isMounted) return;
        
        console.log("Agent Data:", agentResponse.data);
        console.log("Agent Email:", agentResponse.data?.email);
        console.log("Agent AgentId:", agentResponse.data?.agentId);
        console.log("Agent Phone:", agentResponse.data?.phone);
        
        setAgent(agentResponse.data);
        
        // Check subscription status
        if (agentResponse.data?.subscription) {
          const status = checkSubscriptionStatus(agentResponse.data.subscription);
          setSubscriptionStatus(status);
        }
        
        // ✅ Parallel fetch for better performance
        const [propertiesRes, enquiriesRes] = await Promise.all([
          api.get(`/agents/${agentResponse.data._id}/properties`),
          api.get(`/agents/${agentResponse.data._id}/enquiries`)
        ]);
        
        if (!isMounted) return;
        
        setProperties(propertiesRes.data || []);
        setEnquiries(enquiriesRes.data || []);

      } catch (err) {
        if (!isMounted) return;
        
        console.error("Failed to fetch agent data:", err);
        console.error("Error details:", err.response?.data);
        
        // ✅ User-friendly error messages
        if (err.response?.status === 400) {
          setError("Invalid agent ID. Please check and try again.");
        } else if (err.response?.status === 403) {
          setError("You don't have permission to view this profile.");
        } else if (err.response?.status === 404) {
          setError("Agent profile not found.");
        } else if (!err.response) {
          setError("Network error. Please check your connection.");
        } else {
          setError("Failed to load agent data. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAgentData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Handle subscription renewal
  const handleRenewSubscription = async () => {
    // Show confirmation for early renewal
    if (subscriptionStatus?.isActive) {
      setShowRenewConfirm(true);
      return;
    }
    
    await processRenewal();
  };

  const processRenewal = async () => {
    try {
      setRenewing(true);
      setSubscriptionMsg("");
      setShowRenewConfirm(false);

      console.log("📡 Sending renewal request...");
      
      const response = await api.post("/payments/agent/create-renewal-order");
      
      console.log("✅ Backend response:", response);
      console.log("📦 Response data:", response.data);
      
      if (response.data.success) {
        // Get the payment_session_id from backend
        const paymentSessionId = response.data.payment_session_id;
        
        if (!paymentSessionId) {
          console.error("❌ No payment_session_id in response");
          setSubscriptionMsg("❌ Failed to create payment session");
          setRenewing(false);
          return;
        }
        
        console.log("🎯 Payment Session ID received:", paymentSessionId);
        
        // DIRECTLY open Cashfree with the payment_session_id
        console.log("💰 Opening Cashfree with payment_session_id:", paymentSessionId);
        openCashfreePayment(paymentSessionId);
        
      } else {
        setSubscriptionMsg("❌ Failed to create renewal order");
        setRenewing(false);
      }
    } catch (err) {
      console.error("Renewal error:", err);
      setSubscriptionMsg("❌ " + (err.response?.data?.error || "Renewal failed"));
      setRenewing(false);
    }
  };

  const openCashfreePayment = (paymentSessionId) => {
    console.log("💰 Opening Cashfree payment with session ID:", paymentSessionId);
    
    // Check environment
    const cashfreeEnv = import.meta.env.VITE_CASHFREE_ENV === "PROD" ? "production" : "sandbox";
    console.log("🌍 Cashfree environment:", cashfreeEnv);
    console.log("🔑 VITE_CASHFREE_ENV:", import.meta.env.VITE_CASHFREE_ENV);
    
    // Make sure Cashfree SDK is loaded
    if (typeof window.Cashfree === "undefined") {
      console.error("❌ Cashfree SDK not loaded");
      alert("Payment gateway not loaded. Please refresh and try again.");
      return;
    }
    
    console.log("✅ Initializing Cashfree...");
    
    try {
      const cashfree = new window.Cashfree({
        mode: cashfreeEnv,
      });

      // Open checkout with redirect
      console.log("🎯 Opening Cashfree checkout...");
      
      cashfree.checkout({
        paymentSessionId: paymentSessionId,
        redirectTarget: "_self", // This should redirect after payment
      }).then(result => {
        console.log("✅ Cashfree checkout opened:", result);
      }).catch(error => {
        console.error("❌ Cashfree checkout failed:", error);
        alert("Payment gateway error: " + error.message);
      });
      
    } catch (error) {
      console.error("❌ Error in Cashfree:", error);
      alert("Failed to open payment gateway");
    }
  };

  const totalEarnings = useMemo(() => {
    if (!agent || !properties.length) return 0;

    const pct = agent.commissionPercent || 2;

    return properties.reduce((sum, p) => sum + (p.price || 0) * (pct / 100), 0);
  }, [properties, agent]);

  // Renewal Confirmation Modal
  const RenewConfirmModal = () => (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>⚠️ Early Renewal Confirmation</h3>
        
        <div style={styles.modalBody}>
          <p style={styles.modalText}>
            Your current subscription is still valid for <strong>{subscriptionStatus?.daysRemaining} days</strong>.
          </p>
          
          <p style={styles.modalText}>
            If you renew now, your new subscription will start from today ({new Date().toLocaleDateString('en-IN')}) 
            and extend for 30 days from the payment date.
          </p>
          
          <div style={styles.modalWarning}>
            <p style={{ margin: 0, fontWeight: '600', color: '#dc2626' }}>
              ⚠️ Important: Your remaining days will not be carried over.
            </p>
          </div>
          
          <p style={styles.modalText}>
            Do you want to proceed with early renewal?
          </p>
        </div>
        
        <div style={styles.modalActions}>
          <button 
            onClick={() => setShowRenewConfirm(false)}
            style={styles.modalCancelBtn}
            disabled={renewing}
          >
            Cancel
          </button>
          <button 
            onClick={processRenewal}
            style={styles.modalConfirmBtn}
            disabled={renewing}
          >
            {renewing ? "Processing..." : "Yes, Renew Now"}
          </button>
        </div>
      </div>
    </div>
  );

  // ✅ Display error message
  if (error) {
    return (
      <div style={{ 
        padding: "2rem", 
        textAlign: "center",
        maxWidth: "600px",
        margin: "0 auto"
      }}>
        <div style={{ 
          background: "#fee", 
          padding: "1rem", 
          borderRadius: "8px",
          border: "1px solid #fcc"
        }}>
          <h3 style={{ color: "#c00", marginBottom: "1rem" }}>Error</h3>
          <p style={{ marginBottom: "1rem" }}>{error}</p>
          <div>
            <button 
              onClick={() => setError(null)}
              style={{
                background: "#007bff",
                color: "white",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "1rem"
              }}
            >
              Try Again
            </button>
            <button 
              onClick={() => navigate("/")}
              style={{
                background: "#6c757d",
                color: "white",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <h3 style={{ textAlign: "center" }}>Loading...</h3>;

  return (
    <div style={styles.page}>
      <style>{`
        @media (max-width: 768px) {
          .topFlex {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 20px;
          }
          
          .subscriptionCard {
            flex-direction: column !important;
            text-align: center !important;
          }
          
          .subscriptionButtons {
            justify-content: center !important;
            margin-top: 15px;
          }
          
          .profileCard {
            left: 20px !important;
            right: 20px !important;
            min-width: auto !important;
            flex-direction: column;
            align-items: flex-start;
            padding: 15px !important;
          }
          
          .profileInfo {
            width: 100%;
          }
        }
        
        .subscriptionRenewBtn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }
        
        .subscriptionInfoBtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .statCard:hover, .earnCard:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        
        /* Ensure text visibility */
        .profileDetail {
          opacity: 1 !important;
          visibility: visible !important;
          display: flex !important;
        }
        
        .email, .agentId, .phone {
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        }
      `}</style>

      {showRenewConfirm && <RenewConfirmModal />}

      <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>

      {/* --- Banner / Profile Card --- */}
      <div style={styles.banner}>
        <div style={styles.bannerOverlay}></div>

        <div style={styles.profileCard}>
          <div style={styles.avatar}>
            {agent?.name?.charAt(0).toUpperCase() || 'A'}
          </div>

          <div style={styles.profileInfo}>
            <h2 style={styles.name}>{agent?.name || 'Agent Name'}</h2>
            
            {/* Email with fallback */}
            <div style={styles.profileDetail} className="profileDetail">
              <span style={styles.detailIcon}>📧</span>
              <p style={styles.email}>
                {agent?.email || 'No email provided'}
              </p>
            </div>
            
            {/* Agent ID with fallback */}
            <div style={styles.profileDetail} className="profileDetail">
              <span style={styles.detailIcon}>🆔</span>
              <p style={styles.agentId}>
                Agent ID: <b style={{ color: "#4f46e5" }}>{agent?.agentId || agent?._id || 'N/A'}</b>
              </p>
            </div>
            
            {/* Additional info if available */}
            {agent?.phone && (
              <div style={styles.profileDetail} className="profileDetail">
                <span style={styles.detailIcon}>📱</span>
                <p style={styles.phone}>
                  {agent.phone}
                </p>
              </div>
            )}
            
            {/* Profession if available */}
            {agent?.profession && (
              <div style={styles.profileDetail} className="profileDetail">
                <span style={styles.detailIcon}>💼</span>
                <p style={styles.profession}>
                  {agent.profession}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Debug section for development - Temporarily show to verify data */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          margin: '20px 0',
          padding: '15px',
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          fontSize: '12px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#dc2626' }}>🔍 Data is available:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
            <div>
              <strong>Name:</strong> {agent?.name}
            </div>
            <div>
              <strong>Email:</strong> {agent?.email}
            </div>
            <div>
              <strong>Agent ID:</strong> {agent?.agentId}
            </div>
            <div>
              <strong>Phone:</strong> {agent?.phone || 'Not provided'}
            </div>
          </div>
        </div>
      )}

      {/* Subscription Status Card */}
      {subscriptionStatus && (
        <div style={{
          ...styles.subscriptionCard,
          background: subscriptionStatus.isExpired ? 
            `linear-gradient(135deg, ${subscriptionStatus.color}20, ${subscriptionStatus.color}10)` : 
            subscriptionStatus.isExpiringSoon ?
            `linear-gradient(135deg, ${subscriptionStatus.color}15, ${subscriptionStatus.color}05)` :
            `linear-gradient(135deg, #16a34a15, #16a34a05)`,
          border: `2px solid ${subscriptionStatus.color}30`
        }}>
          <div className="subscriptionCard" style={styles.subscriptionContent}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ fontSize: "24px" }}>{subscriptionStatus.icon}</span>
                <h3 style={{
                  margin: 0,
                  color: subscriptionStatus.color,
                  fontSize: "20px",
                  fontWeight: "700"
                }}>
                  {subscriptionStatus.status}
                </h3>
              </div>
              
              <p style={styles.subscriptionMessage}>
                {subscriptionStatus.message}
              </p>
              
              <div style={styles.subscriptionDetails}>
                {subscriptionStatus.expiresAt && (
                  <div style={styles.subscriptionDetailItem}>
                    <span style={styles.subscriptionDetailLabel}>Expires:</span>
                    <span style={styles.subscriptionDetailValue}>
                      {subscriptionStatus.expiresAt.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                
                {subscriptionStatus.daysRemaining > 0 && (
                  <div style={styles.subscriptionDetailItem}>
                    <span style={styles.subscriptionDetailLabel}>Days Remaining:</span>
                    <span style={{
                      ...styles.subscriptionDetailValue,
                      color: subscriptionStatus.color,
                      fontWeight: "700"
                    }}>
                      {subscriptionStatus.daysRemaining}
                    </span>
                  </div>
                )}
                
                {agent?.subscription?.amount && (
                  <div style={styles.subscriptionDetailItem}>
                    <span style={styles.subscriptionDetailLabel}>Amount:</span>
                    <span style={styles.subscriptionDetailValue}>
                      ₹{agent.subscription.amount} {agent.subscription.currency || 'INR'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Early Renewal Note */}
              {subscriptionStatus.showRenewEarly && (
                <div style={{
                  marginTop: "12px",
                  padding: "10px 15px",
                  background: "#fff3cd",
                  border: "1px solid #ffc107",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#856404"
                }}>
                  💡 You can renew early. New subscription will start from payment date.
                </div>
              )}
              
              {subscriptionMsg && (
                <div style={{
                  marginTop: "10px",
                  padding: "8px 12px",
                  background: subscriptionMsg.includes("❌") ? "#fee" : "#efe",
                  color: subscriptionMsg.includes("❌") ? "#c00" : "#080",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}>
                  {subscriptionMsg}
                </div>
              )}
            </div>
            
            <div className="subscriptionButtons" style={styles.subscriptionButtons}>
              {/* Always show renew button */}
              <button
                onClick={handleRenewSubscription}
                disabled={renewing}
                className="subscriptionRenewBtn"
                style={{
                  ...styles.renewButton,
                  background: subscriptionStatus.isActive ? 
                    "linear-gradient(135deg, #3b82f6, #1d4ed8)" : // Blue for early renewal
                    `linear-gradient(135deg, ${subscriptionStatus.color}, ${subscriptionStatus.color}80)`,
                  boxShadow: subscriptionStatus.isActive ?
                    "0 4px 8px rgba(59, 130, 246, 0.4)" :
                    `0 4px 8px ${subscriptionStatus.color}40`
                }}
              >
                {renewing ? (
                  <span>⏳ Processing...</span>
                ) : (
                  <span>💳 {subscriptionStatus.renewLabel}</span>
                )}
              </button>
              
              <button
                onClick={() => navigate("/agent-dashboard")}
                className="subscriptionInfoBtn"
                style={styles.infoButton}
              >
                📊 View Dashboard
              </button>
            </div>
          </div>
          
          {/* Warning message for expired/expiring subscriptions */}
          {(subscriptionStatus.isExpired || subscriptionStatus.isExpiringSoon) && (
            <div style={styles.subscriptionWarning}>
              <p style={{ margin: "0 0 8px 0", fontWeight: "600", color: subscriptionStatus.color }}>
                ⚠️ Without active subscription:
              </p>
              <div style={styles.warningList}>
                <span style={styles.warningItem}>❌ Cannot add new properties</span>
                <span style={styles.warningItem}>❌ Cannot edit existing properties</span>
                <span style={styles.warningItem}>❌ Contact information hidden</span>
                <span style={styles.warningItem}>❌ No new enquiries</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Earnings widget */}
      <div style={styles.container}>
        <div className="topFlex" style={styles.topRow}>
          <div style={styles.earnCard}>
            <h3 style={styles.earnAmount}>₹ {totalEarnings.toLocaleString("en-IN")}</h3>
            <p style={styles.earnLabel}>Total Earnings</p>
          </div>

          <div style={styles.statCard}>
            <h3 style={styles.statNum}>{properties.length}</h3>
            <p style={styles.statLabel}>Properties Listed</p>
          </div>

          <div style={styles.statCard}>
            <h3 style={styles.statNum}>{enquiries.length}</h3>
            <p style={styles.statLabel}>Customer Enquiries</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================== */
/*               STYLES            */
/* =============================== */
const styles = {
  page: {
    padding: "25px",
    fontFamily: "Inter, sans-serif",
    background: "#f5f7fb",
    minHeight: "100vh",
  },

  backBtn: {
    marginBottom: "12px",
    padding: "6px 14px",
    background: "transparent",
    border: "1px solid #ccc",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.3s ease",
  },

  /* -------- Modal Styles -------- */
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },

  modalContent: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "30px",
    maxWidth: "500px",
    width: "90%",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
  },

  modalTitle: {
    margin: "0 0 20px 0",
    fontSize: "20px",
    fontWeight: "700",
    color: "#dc2626",
  },

  modalBody: {
    marginBottom: "25px",
  },

  modalText: {
    margin: "0 0 15px 0",
    fontSize: "15px",
    lineHeight: "1.5",
    color: "#4b5563",
  },

  modalWarning: {
    backgroundColor: "#fef2f2",
    borderLeft: "4px solid #dc2626",
    padding: "12px 15px",
    margin: "15px 0",
    borderRadius: "4px",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },

  modalCancelBtn: {
    padding: "10px 20px",
    backgroundColor: "#f3f4f6",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  modalConfirmBtn: {
    padding: "10px 20px",
    backgroundColor: "#dc2626",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  /* -------- Banner -------- */
  banner: {
    position: "relative",
    height: "220px", // Increased height
    borderRadius: "20px",
    backgroundImage: "url('https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1500&q=80')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    marginBottom: "100px", // Increased margin
    overflow: "hidden",
  },

  bannerOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))",
    borderRadius: "20px",
  },

  profileCard: {
    position: "absolute",
    bottom: "-70px", // Moved further down
    left: "40px",
    display: "flex",
    alignItems: "flex-start",
    gap: "25px",
    background: "rgba(255,255,255,0.98)", // More opaque
    backdropFilter: "blur(10px)",
    padding: "25px 30px", // Increased padding
    borderRadius: "20px",
    boxShadow: "0 15px 40px rgba(0,0,0,0.2)",
    color: "#333",
    zIndex: 2,
    minWidth: "450px", // Increased min width
    border: "1px solid rgba(255,255,255,0.3)",
  },

  avatar: {
    width: "80px", // Larger avatar
    height: "80px",
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px", // Larger font
    fontWeight: "800",
    color: "#fff",
    flexShrink: 0,
    border: "4px solid white",
    boxShadow: "0 4px 15px rgba(79, 70, 229, 0.3)",
  },

  profileInfo: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    margin: "0 0 15px 0",
    fontSize: "28px", // Larger
    fontWeight: "900", // Bolder
    color: "#111",
    letterSpacing: "-0.5px",
  },

  profileDetail: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "10px",
    opacity: 1,
    visibility: "visible",
  },

  detailIcon: {
    fontSize: "16px",
    width: "24px",
    textAlign: "center",
    color: "#4f46e5",
  },

  email: {
    margin: 0,
    fontSize: "16px",
    color: "#444",
    fontWeight: "600", // Bolder
    wordBreak: "break-word",
    opacity: 1,
    visibility: "visible",
  },

  agentId: {
    margin: 0,
    fontSize: "15px",
    color: "#666",
    fontWeight: "600", // Bolder
    opacity: 1,
    visibility: "visible",
  },

  phone: {
    margin: 0,
    fontSize: "16px",
    color: "#444",
    fontWeight: "600", // Bolder
    opacity: 1,
    visibility: "visible",
  },

  profession: {
    margin: 0,
    fontSize: "15px",
    color: "#666",
    fontWeight: "500",
    fontStyle: "italic",
  },

  /* -------- Subscription Card -------- */
  subscriptionCard: {
    margin: "30px 0 40px 0", // Increased top margin
    padding: "25px",
    borderRadius: "20px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
    transition: "all 0.3s ease",
  },

  subscriptionContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  subscriptionMessage: {
    margin: "8px 0 15px 0",
    fontSize: "16px",
    color: "#555",
    fontWeight: "500",
  },

  subscriptionDetails: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    marginTop: "15px",
  },

  subscriptionDetailItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  subscriptionDetailLabel: {
    fontSize: "14px",
    color: "#666",
    fontWeight: "500",
  },

  subscriptionDetailValue: {
    fontSize: "15px",
    color: "#333",
    fontWeight: "600",
  },

  subscriptionButtons: {
    display: "flex",
    gap: "15px",
  },

  renewButton: {
    padding: "12px 28px",
    border: "none",
    borderRadius: "12px",
    color: "white",
    fontWeight: "700",
    fontSize: "16px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    minWidth: "200px",
  },

  infoButton: {
    padding: "12px 28px",
    background: "linear-gradient(135deg, #6b7280, #4b5563)",
    border: "none",
    borderRadius: "12px",
    color: "white",
    fontWeight: "700",
    fontSize: "16px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },

  subscriptionWarning: {
    marginTop: "20px",
    padding: "18px",
    background: "rgba(255, 255, 255, 0.7)",
    borderRadius: "12px",
    borderLeft: "4px solid #f59e0b",
  },

  warningList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "10px",
  },

  warningItem: {
    fontSize: "14px",
    color: "#666",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  /* -------- Stats & Earnings -------- */
  container: {
    marginTop: "30px",
  },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "10px",
  },

  earnCard: {
    flex: 1,
    padding: "25px",
    background: "#fff",
    borderRadius: "18px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    borderLeft: "5px solid #4f46e5",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },

  earnAmount: {
    margin: 0,
    fontSize: "32px",
    color: "#4f46e5",
    fontWeight: "800",
  },

  earnLabel: {
    margin: "6px 0 0 0",
    color: "#666",
    fontSize: "15px",
    fontWeight: "500",
  },

  statCard: {
    flex: 1,
    padding: "25px",
    background: "#fff",
    borderRadius: "18px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    textAlign: "center",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },

  statNum: {
    margin: 0,
    fontSize: "34px",
    fontWeight: "800",
    color: "#111",
  },

  statLabel: {
    marginTop: "6px",
    fontSize: "15px",
    color: "#555",
    fontWeight: "500",
  },
};