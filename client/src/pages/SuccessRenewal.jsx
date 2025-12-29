import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/api";

export default function RenewalSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [message, setMessage] = useState("Verifying your payment...");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState(queryParams.get('order_id') || "");
  const [userEmail, setUserEmail] = useState("");
  const [userType, setUserType] = useState(""); // ✅ ADDED: Track user type

  useEffect(() => {
    // Get email from localStorage (set during renewal process)
    const renewalUser = JSON.parse(localStorage.getItem("renewalUser") || "{}");
    if (renewalUser.email) {
      setUserEmail(renewalUser.email);
    }

    if (!orderId) {
      setMessage("❌ No order ID found in URL");
      setLoading(false);
      return;
    }

    verifyPayment();
  }, [orderId]);

  const verifyPayment = async () => {
    try {
      console.log("🔄 Starting payment verification for order:", orderId);
      
      // ✅ FIXED: Better order ID parsing
      let userId = "";
      let parsedUserType = "";
      
      if (orderId.startsWith('RENEW_AGENT_')) {
        // Format: RENEW_AGENT_USERID_TIMESTAMP
        const parts = orderId.split('_');
        userId = parts[2];
        parsedUserType = 'agent';
      } else if (orderId.startsWith('RENEW_SERVICE_')) {
        // Format: RENEW_SERVICE_USERID_TIMESTAMP
        const parts = orderId.split('_');
        userId = parts[2];
        parsedUserType = 'service-provider';
      } else if (orderId.startsWith('RENEW_SP_')) {
        // Format: RENEW_SP_USERID_TIMESTAMP (alternative)
        const parts = orderId.split('_');
        userId = parts[2];
        parsedUserType = 'service-provider';
      } else {
        throw new Error("Invalid order ID format. Could not determine user type.");
      }
      
      console.log("📦 Verification data:", { 
        orderId, 
        userId, 
        parsedUserType,
        userEmail 
      });
      
      // Store user type for redirect
      setUserType(parsedUserType);
      
      // ✅ FIXED: Use correct endpoint based on userType
      const endpoint = parsedUserType === 'agent' 
        ? '/agents/renewal/verify-payment'
        : '/service-provider/renewal/verify-payment';
      
      console.log("📤 Calling endpoint:", endpoint);
      
      const response = await api.post(endpoint, {
        orderId: orderId,
        userId: userId,
        userType: parsedUserType
      });
      
      const data = response.data;
      console.log("✅ Verification response:", data);
      
      if (data.success) {
        setMessage("✅ Payment verified successfully!");
        setSuccess(true);
        
        // Send confirmation email
        if (data.user?.email) {
          await sendConfirmationEmail(data.user.email, data.user.name, data.subscription);
        } else if (userEmail) {
          await sendConfirmationEmail(userEmail, data.user?.name || "User", data.subscription);
        }
        
        // Clear renewal data from localStorage
        localStorage.removeItem("renewalUser");
        localStorage.removeItem("renewalOrderId");
        localStorage.removeItem("renewalUserId");
        localStorage.removeItem("renewalUserType");
        
        // ✅ FIXED: Redirect to appropriate login page based on user type
        setTimeout(() => {
          const loginPage = getLoginPage(parsedUserType);
          navigate(loginPage, {
            state: {
              renewalSuccess: true,
              email: data.user?.email || userEmail,
              message: 'Subscription renewed successfully! Please login.',
              subscription: data.subscription
            }
          });
        }, 5000);
        
      } else {
        setMessage(`❌ ${data.error || 'Payment verification failed'}`);
        setSuccess(false);
      }
    } catch (error) {
      console.error("❌ Verification error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      
      if (error.response?.status === 400) {
        setMessage(`❌ ${error.response.data?.error || 'Payment not verified yet. Try again in a few seconds.'}`);
      } else if (error.response?.status === 404) {
        setMessage("❌ Verification endpoint not found. Please contact support.");
      } else {
        setMessage(`❌ Failed to verify payment: ${error.message}`);
      }
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ADDED: Function to get correct login page based on user type
  const getLoginPage = (userType) => {
    switch(userType) {
      case 'agent':
        return '/agent-login';
      case 'service-provider':
        return '/service-provider-login';
      default:
        return '/login'; // fallback
    }
  };

  const sendConfirmationEmail = async (email, name, subscription) => {
    try {
      const res = await api.post("/send-payment-email", {
        to: email,
        subject: "Subscription Renewal Successful - RealEstate 24X7",
        name: name,
        amount: subscription?.amount || (orderId.startsWith('RENEW_SERVICE_') ? 1500 : 2000),
        plan: "Subscription Renewal",
        paymentDate: new Date().toLocaleDateString(),
        expiresDate: subscription?.expiresAt 
          ? new Date(subscription.expiresAt).toLocaleDateString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
      });
      
      console.log("📧 Confirmation email sent:", res.data);
    } catch (err) {
      console.error("Failed to send email:", err);
      // Don't fail the whole process if email fails
    }
  };

  // ✅ UPDATED: Handle login redirect based on user type
  const handleLoginRedirect = () => {
    const loginPage = getLoginPage(userType);
    navigate(loginPage, {
      state: {
        renewalSuccess: true,
        email: userEmail
      }
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            {success ? "✅ Payment Successful" : "Payment Status"}
          </h1>
          <p style={styles.subtitle}>
            {success 
              ? "Your subscription has been renewed successfully!" 
              : "Processing your payment..."}
          </p>
        </div>
        
        <div style={styles.content}>
          {/* Loading spinner */}
          {loading && (
            <div style={styles.spinnerContainer}>
              <div style={styles.spinner}></div>
              <p>Verifying payment with Cashfree...</p>
            </div>
          )}
          
          {/* Status message */}
          <div style={{
            ...styles.messageBox,
            background: success ? "#d1fae5" : loading ? "#f0f9ff" : "#fee2e2",
            color: success ? "#065f46" : loading ? "#0369a1" : "#dc2626"
          }}>
            <p style={styles.messageText}>{message}</p>
          </div>
          
          {/* Order details */}
          {orderId && (
            <div style={styles.orderDetails}>
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> {orderId}</p>
              <p><strong>User Type:</strong> {
                userType === 'agent' ? 'Agent' : 
                userType === 'service-provider' ? 'Service Provider' : 'Unknown'
              }</p>
              <p><strong>User Email:</strong> {userEmail || "Not available"}</p>
              <p><strong>Redirecting to:</strong> {
                success ? (userType === 'agent' ? 'Agent Login' : 'Service Provider Login') : 'N/A'
              }</p>
              <p><strong>Status:</strong> {loading ? "Verifying..." : success ? "✅ Verified" : "❌ Failed"}</p>
            </div>
          )}
          
          {/* Action buttons */}
          <div style={styles.actionButtons}>
            {success ? (
              <>
                <button 
                  onClick={handleLoginRedirect}
                  style={styles.primaryButton}
                >
                  Go to {userType === 'agent' ? 'Agent' : 'Service Provider'} Login
                </button>
                <p style={styles.redirectText}>
                  Auto-redirecting in 5 seconds...
                </p>
              </>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/renew')}
                  style={styles.secondaryButton}
                >
                  Try Again
                </button>
                <button 
                  onClick={() => navigate('/')}
                  style={styles.backButton}
                >
                  Back to Home
                </button>
              </>
            )}
          </div>
          
          {/* Support info */}
          <div style={styles.supportSection}>
            <p>Need help? Contact: payments@realestate24x7.com</p>
            <p style={styles.supportNote}>
              Payment confirmation email will be sent within 5 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== STYLES =====================
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  card: {
    background: "white",
    borderRadius: "24px",
    padding: "40px",
    boxShadow: "0 25px 70px rgba(0,0,0,0.3)",
    maxWidth: "600px",
    width: "100%",
    textAlign: "center",
  },

  header: {
    marginBottom: "30px",
  },

  title: {
    fontSize: "32px",
    fontWeight: "900",
    marginBottom: "10px",
    color: "#111827",
  },

  subtitle: {
    fontSize: "18px",
    color: "#6b7280",
    marginBottom: "20px",
  },

  content: {
    marginTop: "20px",
  },

  spinnerContainer: {
    margin: "30px 0",
  },

  spinner: {
    width: "50px",
    height: "50px",
    border: "5px solid #f3f3f3",
    borderTop: "5px solid #4f46e5",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 20px",
  },

  messageBox: {
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "25px",
    fontWeight: "600",
  },

  messageText: {
    fontSize: "16px",
    margin: 0,
  },

  orderDetails: {
    background: "#f8fafc",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "30px",
    textAlign: "left",
  },

  actionButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    marginTop: "30px",
  },

  primaryButton: {
    padding: "16px",
    background: "linear-gradient(135deg, #4f46e5, #3730a3)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    width: "100%",
  },

  secondaryButton: {
    padding: "16px",
    background: "#f0f9ff",
    color: "#0369a1",
    border: "2px solid #bae6fd",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
  },

  backButton: {
    padding: "16px",
    background: "white",
    border: "2px solid #e5e7eb",
    color: "#6b7280",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
  },

  redirectText: {
    fontSize: "14px",
    color: "#6b7280",
    marginTop: "10px",
  },

  supportSection: {
    marginTop: "30px",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
    color: "#6b7280",
    fontSize: "14px",
  },

  supportNote: {
    fontSize: "13px",
    color: "#9ca3af",
    marginTop: "5px",
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
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3);
  }
  
  .secondaryButton:hover {
    background: #e0f2fe;
  }
  
  .backButton:hover {
    background: #f3f4f6;
  }
`;
document.head.appendChild(styleTag);