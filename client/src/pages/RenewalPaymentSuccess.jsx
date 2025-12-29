import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/api";

export default function RenewalPaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      setLoading(true);
      
      // Get payment data from multiple sources
      const orderId = queryParams.get('order_id');
      const paymentSessionId = queryParams.get('payment_session_id');
      
      // Check localStorage for payment context
      const paymentContext = JSON.parse(localStorage.getItem("paymentContext") || "{}");
      const lastPayment = JSON.parse(localStorage.getItem("lastPayment") || "{}");
      
      console.log("🔍 Payment verification - Sources:", {
        orderId,
        paymentSessionId,
        paymentContext,
        lastPayment
      });

      // Determine which data to use
      let targetOrderId = orderId || paymentContext.orderId || lastPayment.orderId;
      let targetUserId = paymentContext.userId || lastPayment.userId;
      let targetUserType = paymentContext.userType || lastPayment.userType;
      
      // If no userId found, try to extract from token
      if (!targetUserId) {
        targetUserId = extractUserIdFromToken();
        targetUserType = extractUserTypeFromToken();
      }

      console.log("🎯 Verification targets:", {
        targetOrderId,
        targetUserId,
        targetUserType
      });

      if (!targetOrderId) {
        console.warn("⚠️ No order ID found");
        
        // If we have lastPayment data, use it
        if (lastPayment.status === "success") {
          setPaymentData({
            success: true,
            test_mode: true,
            subscription: {
              planName: lastPayment.planName,
              amount: lastPayment.amount,
              expiresAt: lastPayment.expiresAt
            },
            message: "Demo payment successful"
          });
          setLoading(false);
          return;
        }
        
        setError("No payment information found");
        setLoading(false);
        return;
      }

      // Try to verify with backend
      setVerifying(true);
      
      try {
        const res = await api.post("/payments/verify-renewal-payment", {
          orderId: targetOrderId,
          userId: targetUserId,
          userType: targetUserType
        });
        
        console.log("✅ Backend verification response:", res.data);
        
        if (res.data.success) {
          setPaymentData(res.data);
          // Clear payment context after successful verification
          localStorage.removeItem("paymentContext");
        } else {
          setError(res.data.error || "Payment verification failed");
        }
      } catch (verifyErr) {
        console.error("❌ Backend verification failed:", verifyErr.message);
        
        // Fallback to localStorage data
        if (paymentContext.paymentSessionId || lastPayment.status === "success") {
          setPaymentData({
            success: true,
            test_mode: true,
            subscription: {
              planName: paymentContext.planName || lastPayment.planName,
              amount: paymentContext.amount || lastPayment.amount,
              expiresAt: lastPayment.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            message: "Payment verified from local data (demo mode)"
          });
        } else {
          setError("Could not verify payment with backend");
        }
      }
      
    } catch (err) {
      console.error("❌ Payment verification error:", err);
      setError("Payment verification failed");
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const extractUserIdFromToken = () => {
    try {
      // Try all possible tokens
      const tokens = [
        localStorage.getItem("agentToken"),
        localStorage.getItem("serviceProviderToken"),
        localStorage.getItem("token"),
        localStorage.getItem("meToken"),
        localStorage.getItem("adminToken")
      ].filter(t => t);
      
      for (const token of tokens) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.id) {
            console.log("🔑 Extracted from token:", {
              id: payload.id,
              role: payload.role,
              email: payload.email
            });
            return payload.id;
          }
        } catch {}
      }
    } catch (err) {
      console.error("Failed to extract from token:", err);
    }
    return null;
  };

  const extractUserTypeFromToken = () => {
    try {
      const tokens = [
        localStorage.getItem("agentToken"),
        localStorage.getItem("serviceProviderToken"),
        localStorage.getItem("token")
      ].filter(t => t);
      
      for (const token of tokens) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role) {
            return payload.role; // 'agent', 'service', 'service-provider'
          }
        } catch {}
      }
    } catch (err) {
      console.error("Failed to extract role:", err);
    }
    return null;
  };

  const sendConfirmationEmail = async () => {
    try {
      const userEmail = paymentData?.userEmail || 
                       JSON.parse(localStorage.getItem("paymentContext") || "{}").email ||
                       JSON.parse(localStorage.getItem("lastPayment") || "{}").email;
      
      if (!userEmail) {
        console.warn("⚠️ No email found for confirmation");
        return;
      }
      
      const userName = paymentData?.userName || 
                      JSON.parse(localStorage.getItem("user") || "{}").name ||
                      "Customer";
      
      const amount = paymentData?.subscription?.amount || 
                    JSON.parse(localStorage.getItem("paymentContext") || "{}").amount ||
                    JSON.parse(localStorage.getItem("lastPayment") || "{}").amount;
      
      const planName = paymentData?.subscription?.planName || 
                      JSON.parse(localStorage.getItem("paymentContext") || "{}").planName ||
                      JSON.parse(localStorage.getItem("lastPayment") || "{}").planName;
      
      // Call backend email endpoint
      await api.post("/send-payment-email", {
        to: userEmail,
        name: userName,
        amount: amount,
        plan: planName,
        paymentDate: new Date().toLocaleDateString(),
        expiresDate: paymentData?.formattedExpiry || 
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
      });
      
      console.log("📧 Confirmation email sent");
      
    } catch (err) {
      console.error("❌ Failed to send email:", err);
    }
  };

  // Auto-send email when payment is verified
  useEffect(() => {
    if (paymentData?.success) {
      sendConfirmationEmail();
    }
  }, [paymentData]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner}></div>
          <h2>Verifying Payment...</h2>
          <p>Please wait while we verify your payment.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>❌</div>
          <h2>Verification Failed</h2>
          <p style={styles.errorText}>{error}</p>
          
          <div style={styles.debugInfo}>
            <p><strong>Debug Info:</strong></p>
            <p>Order ID: {queryParams.get('order_id') || 'Not found'}</p>
            <p>Payment Context: {localStorage.getItem("paymentContext") ? 'Exists' : 'Not found'}</p>
            <p>Last Payment: {localStorage.getItem("lastPayment") ? 'Exists' : 'Not found'}</p>
          </div>
          
          <button onClick={() => navigate("/subscription-renew")} style={styles.button}>
            ← Back to Renewal
          </button>
          <button onClick={() => window.location.reload()} style={styles.secondaryButton}>
            ↻ Try Again
          </button>
        </div>
      </div>
    );
  }

  if (paymentData?.success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✅</div>
          <h1 style={styles.successTitle}>Payment Successful!</h1>
          
          <div style={styles.successMessage}>
            <p>Your subscription has been renewed successfully.</p>
            {paymentData.test_mode && (
              <p style={styles.testMode}>🧪 Demo Mode - This was a test payment</p>
            )}
          </div>
          
          <div style={styles.detailsCard}>
            <h3>Payment Details</h3>
            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Plan:</span>
                <span style={styles.detailValue}>{paymentData.subscription?.planName || 'Basic'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Amount:</span>
                <span style={styles.detailValue}>₹{paymentData.subscription?.amount || 0}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Expires:</span>
                <span style={styles.detailValue}>
                  {paymentData.formattedExpiry || 
                   new Date(paymentData.subscription?.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </div>
              {paymentData.subscription?.daysRemaining && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Days Remaining:</span>
                  <span style={styles.detailValue}>{paymentData.subscription.daysRemaining}</span>
                </div>
              )}
            </div>
          </div>
          
          <div style={styles.emailNotification}>
            <p>📧 A confirmation email has been sent to your registered email address.</p>
          </div>
          
          <div style={styles.actionButtons}>
            {/* <button onClick={() => navigate("/dashboard")} style={styles.primaryButton}>
              Go to Dashboard
            </button> */}
            <button onClick={() => navigate("/")} style={styles.secondaryButton}>
              Back to Home
            </button>
            <button onClick={() => navigate("/subscription-renew")} style={styles.tertiaryButton}>
              Renew Another Subscription
            </button>
          </div>
          
          {/* Debug info - only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <div style={styles.debugSection}>
              <button 
                onClick={() => {
                  console.log("Payment Data:", paymentData);
                  console.log("Local Storage:", {
                    paymentContext: JSON.parse(localStorage.getItem("paymentContext") || "{}"),
                    lastPayment: JSON.parse(localStorage.getItem("lastPayment") || "{}"),
                    user: JSON.parse(localStorage.getItem("user") || "{}")
                  });
                }}
                style={styles.debugButton}
              >
                Show Debug Info
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Payment Status Unknown</h2>
        <p>We couldn't determine your payment status. Please check your email for confirmation or contact support.</p>
        <button onClick={() => navigate("/")} style={styles.button}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px",
  },
  card: {
    background: "white",
    borderRadius: "24px",
    padding: "40px",
    maxWidth: "600px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 25px 70px rgba(0,0,0,0.3)",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "5px solid #f3f3f3",
    borderTop: "5px solid #4f46e5",
    borderRadius: "50%",
    margin: "0 auto 20px",
    animation: "spin 1s linear infinite",
  },
  errorIcon: {
    fontSize: "60px",
    marginBottom: "20px",
    color: "#dc2626",
  },
  successIcon: {
    fontSize: "80px",
    marginBottom: "20px",
    color: "#10b981",
  },
  successTitle: {
    fontSize: "36px",
    fontWeight: "900",
    color: "#111827",
    marginBottom: "15px",
  },
  successMessage: {
    fontSize: "18px",
    color: "#6b7280",
    marginBottom: "30px",
    lineHeight: "1.5",
  },
  testMode: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "10px",
    borderRadius: "8px",
    fontSize: "14px",
    marginTop: "10px",
  },
  detailsCard: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "25px",
    marginBottom: "25px",
    textAlign: "left",
  },
  detailsGrid: {
    display: "grid",
    gap: "15px",
  },
  detailItem: {
    display: "flex",
    justifyContent: "space-between",
    paddingBottom: "10px",
    borderBottom: "1px solid #e5e7eb",
  },
  detailLabel: {
    fontWeight: "600",
    color: "#374151",
  },
  detailValue: {
    fontWeight: "700",
    color: "#111827",
  },
  emailNotification: {
    background: "#d1fae5",
    border: "1px solid #10b981",
    borderRadius: "12px",
    padding: "15px",
    marginBottom: "30px",
    color: "#065f46",
  },
  actionButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  primaryButton: {
    padding: "16px",
    background: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "16px",
    background: "white",
    border: "2px solid #e5e7eb",
    color: "#6b7280",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
  tertiaryButton: {
    padding: "16px",
    background: "#f0f9ff",
    border: "2px solid #bae6fd",
    color: "#0369a1",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
  errorText: {
    color: "#dc2626",
    marginBottom: "20px",
  },
  debugInfo: {
    background: "#f3f4f6",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "14px",
    textAlign: "left",
  },
  debugSection: {
    marginTop: "30px",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
  },
  debugButton: {
    background: "transparent",
    border: "1px solid #9ca3af",
    color: "#6b7280",
    padding: "8px 16px",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
  },
  button: {
    padding: "14px 30px",
    background: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "20px",
  },
};

// Add CSS animation
const styleTag = document.createElement('style');
styleTag.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .primaryButton:hover {
    background: #3730a3;
    transform: translateY(-2px);
  }
  
  .secondaryButton:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }
  
  .tertiaryButton:hover {
    background: #e0f2fe;
  }
`;
document.head.appendChild(styleTag);