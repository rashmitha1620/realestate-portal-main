import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

/* ===============================
   PLAN CONFIG
================================ */
const PLANS = {
  "service-provider": {
    name: "Service Provider Plan",
    price: 1500,
    duration: "month",
    features: [
      "✅ Unlimited services listing",
      "✅ Contact visible to clients",
      "✅ Receive service enquiries",
      "✅ Priority search ranking",
      "✅ Dashboard analytics",
      "✅ 24/7 Support"
    ],
    whatYouLose: [
      "❌ Contact information hidden",
      "❌ Cannot add new services",
      "❌ Cannot edit existing services",
      "❌ No new enquiries",
      "❌ Limited dashboard access"
    ]
  },
  agent: {
    name: "Agent Plan",
    price: 2000,
    duration: "month",
    features: [
      "✅ Unlimited property listings",
      "✅ Buyer contact access",
      "✅ Featured property priority",
      "✅ Dashboard analytics",
      "✅ Property enquiry notifications",
      "✅ 24/7 Support"
    ],
    whatYouLose: [
      "❌ Contact information hidden",
      "❌ Cannot add new properties",
      "❌ Cannot edit existing properties",
      "❌ No new enquiries",
      "❌ Limited dashboard access"
    ]
  },
};

export default function RenewSubscription() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [showManualOption, setShowManualOption] = useState(false);

  /* ===============================
     LOAD USER + SUBSCRIPTION
  ================================ */
 useEffect(() => {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

  if (!storedUser || (!storedUser.isService && !storedUser.isAgent)) {
    navigate("/login");
    return;
  }

  const role = storedUser.isService ? "service-provider" : "agent";
  
  setUser(storedUser);
  setUserType(role);
  
  // ✅ ADD DEBUG LOGS HERE
  console.log("🔍 DEBUG - User from localStorage:", storedUser);
  console.log("📊 Checking ID properties:", {
    has_id: !!storedUser.id,
    has__id: !!storedUser._id,
    has_userId: !!storedUser.userId,
    id_value: storedUser.id,
    _id_value: storedUser._id,
    userId_value: storedUser.userId
  });
  console.log("💰 Using for fetch:", storedUser.id || storedUser._id);
  // END DEBUG
  
  // Check if redirected from subscription guard
  const expiredInfo = localStorage.getItem("subscriptionExpired");
  if (expiredInfo) {
    console.log("Redirected from expired subscription:", JSON.parse(expiredInfo));
  }

  fetchSubscription(role, storedUser.id || storedUser._id);
}, []);

  const fetchSubscription = async (role, userId) => {
  try {
    setLoading(true);
    setMessage("");
    
    console.log("📡 Fetching subscription for:", { role, userId });
    
    let endpoint = "";
    let responseData = null;
    
    if (role === "agent") {
      endpoint = "/agents/subscription-status";
      const res = await api.get(endpoint);
      responseData = res.data;
      
      if (responseData.success) {
        // Agent response structure: res.data.subscription
        setSubscription(responseData.subscription);
      }
    } else {
      // Service provider - try different endpoints
      try {
        // Try the detailed endpoint first
        endpoint = `/payments/subscription/status/provider/${userId}`;
        console.log("🔍 Trying endpoint 1:", endpoint);
        const res1 = await api.get(endpoint);
        responseData = res1.data;
        
        if (responseData.success) {
          // This endpoint might have subscription directly or in data.subscription
          const subscriptionData = responseData.subscription || responseData.data?.subscription || responseData;
          console.log("✅ Got subscription from payments endpoint:", subscriptionData);
          setSubscription(subscriptionData);
        }
      } catch (err1) {
        console.log("⚠️ Endpoint 1 failed, trying endpoint 2");
        
        // Try the user subscription endpoint
        endpoint = "/service-provider/user/subscription-status";
        const res2 = await api.get(endpoint);
        responseData = res2.data;
        
        console.log("🔍 Endpoint 2 response:", responseData);
        
        if (responseData.success) {
          // This endpoint returns: {success, isServiceProvider, canPost, subscription: {...}}
          setSubscription(responseData.subscription); // <-- FIXED HERE
        }
      }
    }
    
    if (!responseData || !responseData.success) {
      console.warn("⚠️ API returned success:false or no data", responseData);
      setSubscription({
        active: false,
        expiresAt: null,
        daysRemaining: 0,
        needsRenewal: true
      });
    }
    
  } catch (err) {
    console.error("❌ Error fetching subscription:", err.response?.data || err.message);
    setMessage("❌ Failed to load subscription status");
    setSubscription({
      active: false,
      expiresAt: null,
      daysRemaining: 0,
      needsRenewal: true
    });
  } finally {
    setLoading(false);
  }
};
  /* ===============================
     PAYMENT METHODS
  ================================ */


// Method 1: Online Payment (Cashfree)
const handleOnlinePayment = async () => {
  try {
    setPaying(true);
    setMessage("");

    // ✅ CRITICAL FIX: Store user data BEFORE creating payment
    console.log("💾 Storing user data for verification...");
    
    if (user) {
      // Find the correct ID property
      const userId = user.id || user._id || user.userId;
      console.log("📌 User ID to store:", userId);
      console.log("📋 All ID options:", {
        id: user.id,
        _id: user._id,
        userId: user.userId
      });
      
      if (!userId) {
        throw new Error("Cannot find user ID in user object");
      }
      
      // Store both formats for safety
      localStorage.setItem("userId", userId);
      localStorage.setItem("user", JSON.stringify(user));
      
      console.log("✅ User data stored successfully");
      console.log("🆔 localStorage userId:", localStorage.getItem("userId"));
    } else {
      console.error("❌ No user object found!");
      throw new Error("User not found. Please refresh the page.");
    }

    const endpoint =
      userType === "agent"
        ? "/payments/agent/create-renewal-order"
        : "/payments/service-provider/create-renewal-order";

    const res = await api.post(endpoint);
    const { payment_session_id, order_id } = res.data;

    if (!payment_session_id) {
      throw new Error("Payment session missing");
    }

    // ✅ Store order ID for reference
    if (order_id) {
      localStorage.setItem("pendingOrderId", order_id);
      console.log("📦 Order ID stored:", order_id);
    }

    console.log("🔑 Cashfree Mode:", import.meta.env.VITE_CASHFREE_ENV === "PROD" ? "production" : "sandbox");

    const cashfree = new window.Cashfree({
      mode: import.meta.env.VITE_CASHFREE_ENV === "PROD" ? "production" : "sandbox",
    });

    // 🚀 Open checkout
    cashfree.checkout({
      paymentSessionId: payment_session_id,
      redirectTarget: "_self",
    });

  } catch (err) {
    console.error("❌ Payment init failed:", err);
    setMessage(err.message || "Payment failed");
    setShowManualOption(true);
    setPaying(false);
  }
};
  // Method 2: Manual Payment (Bank Transfer/UPI)
  const handleManualPayment = () => {
    setMessage(`
      📞 Manual Payment Instructions:
      
      Bank Transfer Details:
      Account Name: Real Estate Portal
      Account Number: 1234567890
      IFSC Code: SBIN0001234
      Bank: State Bank of India
      
      UPI ID: realestateportal@upi
      
      After payment, WhatsApp screenshot to: +91-9876543210
      or Email to: payments@realestateportal.com
      
      Include your User ID: ${user?.id || user?._id}
    `);
    
    // Copy to clipboard
    navigator.clipboard.writeText(`User ID: ${user?.id || user?._id}`);
  };

  /* ===============================
     BACK TO DASHBOARD
  ================================ */
  const handleBackToDashboard = () => {
    if (userType === "service-provider") {
      navigate("/service-provider-dashboard");
    } else if (userType === "agent") {
      navigate("/agent-dashboard");
    } else {
      navigate("/");
    }
  };

  /* ===============================
     LOADING STATE
  ================================ */
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading subscription details...</p>
      </div>
    );
  }

  const plan = PLANS[userType] || PLANS["service-provider"];

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <button onClick={handleBackToDashboard} style={styles.backButton}>
          ← Back to Dashboard
        </button>
        <h1 style={styles.title}>🔔 Renew Your Subscription</h1>
        {user && (
          <p style={styles.welcome}>
            Welcome back, <strong>{user.name}</strong>!
          </p>
        )}
      </div>

      {/* CURRENT STATUS */}
      {subscription && (
        <div style={styles.statusCard}>
          <h3 style={styles.statusTitle}>Current Subscription Status</h3>
          <div style={styles.statusGrid}>
            <div>
              <strong>Status:</strong>{" "}
              <span style={{
                color: subscription.active ? "#2ecc71" : "#e74c3c",
                fontWeight: "bold"
              }}>
                {subscription.active ? "Active" : "Expired"}
              </span>
            </div>
            
            {subscription.expiresAt && (
              <div>
                <strong>Expires:</strong>{" "}
                {new Date(subscription.expiresAt).toLocaleDateString()}
              </div>
            )}
            
            {subscription.daysRemaining !== null && subscription.daysRemaining > 0 && (
              <div>
                <strong>Days Remaining:</strong>{" "}
                <span style={{
                  color: subscription.daysRemaining <= 3 ? "#e67e22" : "#2ecc71",
                  fontWeight: "bold"
                }}>
                  {subscription.daysRemaining} day{subscription.daysRemaining !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            
            {subscription.needsRenewal && (
              <div style={styles.warningBox}>
                ⚠️ Your subscription needs renewal to continue all features
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLAN DETAILS */}
      <div style={styles.planCard}>
        <div style={styles.planHeader}>
          <h2>{plan.name}</h2>
          <div style={styles.price}>
            <span style={styles.amount}>₹{plan.price}</span>
            <span style={styles.duration}>/{plan.duration}</span>
          </div>
        </div>

        <div style={styles.features}>
          <h4>✅ What you get:</h4>
          <ul style={styles.featuresList}>
            {plan.features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>

        <div style={styles.warningSection}>
          <h4>⚠️ Without subscription:</h4>
          <ul style={styles.warningList}>
            {plan.whatYouLose.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        {/* PAYMENT OPTIONS */}
        <div style={styles.paymentSection}>
          <button
            onClick={handleOnlinePayment}
            disabled={paying}
            style={styles.payButton}
          >
            {paying ? "Processing..." : `Pay ₹${plan.price} Online Now`}
          </button>

          <button
            onClick={() => setShowManualOption(!showManualOption)}
            style={styles.manualToggle}
          >
            💳 {showManualOption ? "Hide" : "Show"} Manual Payment Option
          </button>

          {showManualOption && (
            <div style={styles.manualPayment}>
              <button onClick={handleManualPayment} style={styles.manualButton}>
                📋 Copy Manual Payment Instructions
              </button>
              <p style={styles.note}>
                After manual payment, contact support with payment proof
              </p>
            </div>
          )}

          {message && (
            <div style={styles.message}>
              {message.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}

          <p style={styles.paymentNote}>
            💳 Secure payment powered by Cashfree. All cards, UPI, NetBanking accepted.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div style={styles.faq}>
        <h3>❓ Frequently Asked Questions</h3>
        <div style={styles.faqItem}>
          <strong>Q: When will my subscription activate?</strong>
          <p>A: Immediately after payment confirmation. You'll receive an email.</p>
        </div>
        <div style={styles.faqItem}>
          <strong>Q: Can I get a refund?</strong>
          <p>A: Refunds available within 24 hours if no services used.</p>
        </div>
        <div style={styles.faqItem}>
          <strong>Q: Need help?</strong>
          <p>A: 📞 +91-9876543210 | 📧 support@realestateportal.com</p>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   STYLES
================================ */
const styles = {
  container: {
    padding: "30px",
    maxWidth: "800px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white"
  },
  spinner: {
    border: "5px solid rgba(255,255,255,0.3)",
    borderTop: "5px solid white",
    borderRadius: "50%",
    width: "50px",
    height: "50px",
    animation: "spin 1s linear infinite",
    marginBottom: "20px"
  },
  header: {
    marginBottom: "30px",
    position: "relative"
  },
  backButton: {
    position: "absolute",
    left: "0",
    top: "0",
    background: "none",
    border: "2px solid #667eea",
    color: "#667eea",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.3s"
  },
  title: {
    textAlign: "center",
    color: "#333",
    fontSize: "2.5rem",
    marginBottom: "10px"
  },
  welcome: {
    textAlign: "center",
    color: "#666",
    fontSize: "1.1rem"
  },
  statusCard: {
    background: "#f8f9fa",
    borderRadius: "15px",
    padding: "25px",
    marginBottom: "25px",
    borderLeft: "5px solid #667eea"
  },
  statusTitle: {
    marginTop: "0",
    marginBottom: "20px",
    color: "#333"
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px"
  },
  warningBox: {
    gridColumn: "1 / -1",
    background: "#fff3cd",
    border: "1px solid #ffeaa7",
    color: "#856404",
    padding: "10px",
    borderRadius: "5px",
    marginTop: "10px"
  },
  planCard: {
    border: "1px solid #ddd",
    borderRadius: "15px",
    padding: "30px",
    background: "white",
    boxShadow: "0 5px 15px rgba(0,0,0,0.08)"
  },
  planHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    paddingBottom: "20px",
    borderBottom: "2px solid #eee"
  },
  price: {
    textAlign: "right"
  },
  amount: {
    fontSize: "3rem",
    fontWeight: "800",
    color: "#667eea"
  },
  duration: {
    fontSize: "1.2rem",
    color: "#666"
  },
  features: {
    marginBottom: "25px"
  },
  featuresList: {
    listStyle: "none",
    padding: "0"
  },
  warningSection: {
    background: "#fff3cd",
    border: "1px solid #ffeaa7",
    borderRadius: "10px",
    padding: "20px",
    margin: "25px 0"
  },
  warningList: {
    listStyle: "none",
    padding: "0",
    color: "#856404"
  },
  paymentSection: {
    textAlign: "center",
    marginTop: "30px"
  },
  payButton: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    padding: "18px 40px",
    fontSize: "1.2rem",
    fontWeight: "700",
    borderRadius: "10px",
    cursor: "pointer",
    width: "100%",
    marginBottom: "15px",
    transition: "transform 0.3s, box-shadow 0.3s"
  },
  manualToggle: {
    background: "#f8f9fa",
    color: "#333",
    border: "2px solid #ddd",
    padding: "15px 30px",
    fontSize: "1rem",
    borderRadius: "10px",
    cursor: "pointer",
    width: "100%",
    marginBottom: "15px",
    transition: "all 0.3s"
  },
  manualPayment: {
    marginTop: "20px",
    padding: "20px",
    background: "#e3f2fd",
    borderRadius: "10px"
  },
  manualButton: {
    background: "#2196F3",
    color: "white",
    border: "none",
    padding: "15px 25px",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
    marginBottom: "10px"
  },
  message: {
    padding: "15px",
    background: "#e8f5e9",
    color: "#2e7d32",
    borderRadius: "10px",
    margin: "20px 0",
    textAlign: "left",
    whiteSpace: "pre-line"
  },
  paymentNote: {
    color: "#666",
    fontSize: "0.9rem",
    marginTop: "15px"
  },
  faq: {
    marginTop: "40px",
    background: "#f8f9fa",
    padding: "25px",
    borderRadius: "15px"
  },
  faqItem: {
    marginBottom: "20px",
    paddingBottom: "20px",
    borderBottom: "1px solid #eee"
  }
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(styleSheet);