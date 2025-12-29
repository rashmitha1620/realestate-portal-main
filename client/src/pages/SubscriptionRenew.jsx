import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/api";

export default function SubscriptionRenew() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [userEmail, setUserEmail] = useState(queryParams.get('email') || "");
  const [userType, setUserType] = useState(queryParams.get('type') || "");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cashfree');
  const [showUpiOptions, setShowUpiOptions] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');
  const [currentOrderId, setCurrentOrderId] = useState("");

  // Clear any existing tokens to prevent auth issues
  useEffect(() => {
    clearExistingTokens();
    detectUserFromLocalStorage();
  }, []);

  const clearExistingTokens = () => {
    localStorage.removeItem("agentToken");
    localStorage.removeItem("serviceProviderToken");
    localStorage.removeItem("lastOrderId");
    localStorage.removeItem("lastPayment");
  };

  const detectUserFromLocalStorage = () => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

    if (storedUser.email) {
      if (!userEmail) {
        setUserEmail(storedUser.email);
      }
      
      if (!userType) {
        if (storedUser.role === 'agent' || storedUser.isAgent) {
          setUserType('agent');
        } else if (storedUser.role === 'service' || storedUser.role === 'service-provider') {
          setUserType('service-provider');
        }
      }
      
      if (storedUser.name) {
        setUserInfo({
          name: storedUser.name,
          userType: storedUser.role === 'agent' ? 'Property Agent' : 'Service Provider'
        });
      }
    }
  };

  // ✅ FIXED: Email verification
  const verifyEmail = async () => {
    try {
      setLoading(true);
      setMessage("");
      
      // Clear old tokens before verification
      clearExistingTokens();
      
      // ✅ CRITICAL FIX: Ensure userType is correct
      const finalUserType = userType === 'service' ? 'service-provider' : userType;
      
      const endpoint = finalUserType === 'agent' 
        ? `/agents/renewal/verify-email`
        : `/service-provider/renewal/verify-email`;
      
      console.log("📤 Email verification endpoint:", endpoint, { email: userEmail, userType: finalUserType });
      
      const res = await api.post(endpoint, {
        email: userEmail,
        userType: finalUserType
      });
      
      if (res.data.success) {
        setUserId(res.data.user.id);
        setEmailVerified(true);
        setUserInfo({
          name: res.data.user.name,
          userType: finalUserType === 'agent' ? 'Property Agent' : 'Service Provider',
          phone: res.data.user.phone || '',
          agentId: res.data.user.agentId || ''
        });
        setMessage("✅ Email verified successfully!");
        
        // Store user info for later use
        localStorage.setItem("renewalUser", JSON.stringify({
          id: res.data.user.id,
          email: userEmail,
          name: res.data.user.name,
          type: finalUserType
        }));
      } else {
        setMessage(`❌ ${res.data.error || 'Verification failed'}`);
      }
    } catch (err) {
      console.error("Verification error:", err.response?.data || err.message);
      
      if (err.response?.status === 404) {
        setMessage(`❌ Email not registered. Try as ${userType === 'agent' ? 'service provider' : 'agent'}?`);
      } else {
        setMessage("❌ Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Payment creation with correct userType storage
  const handlePayment = async (planName, planAmount) => {
    if (!emailVerified) {
      setMessage("❌ Please verify your email first");
      return;
    }

    try {
      setLoading(true);
      setMessage("Creating payment session...");

      let endpoint;
      let requestData;

      // ✅ CRITICAL FIX: Use correct userType
      const finalUserType = userType === 'service' ? 'service-provider' : userType;
      
      if (finalUserType === 'agent') {
        endpoint = "/agents/renewal/create-order";
        requestData = {
          userId: userId,
          userType: finalUserType,
          email: userEmail
        };
      } else if (finalUserType === 'service-provider') {
        endpoint = "/service-provider/renewal/create-order";
        requestData = {
          userId: userId,
          userType: finalUserType,
          email: userEmail
        };
      } else {
        setMessage("❌ Invalid user type");
        return;
      }

      console.log("📤 Calling payment endpoint:", endpoint, requestData);
      const res = await api.post(endpoint, requestData);
      console.log("✅ Payment API Response:", res.data);

      if (res.data.success) {
        // Check if we got a valid payment_session_id
        const paymentSessionId = res.data.payment_session_id || res.data.paymentSessionId;
        
        if (paymentSessionId && paymentSessionId.startsWith('session_')) {
          console.log("💳 Valid payment session ID received:", paymentSessionId);
          
          // ✅ CRITICAL FIX: Store correct userType
          setCurrentOrderId(res.data.orderId);
          localStorage.setItem("renewalOrderId", res.data.orderId);
          localStorage.setItem("renewalUserId", userId);
          localStorage.setItem("renewalUserType", finalUserType); // Store as 'service-provider' not 'service'
          
          console.log("💾 Stored in localStorage:", {
            orderId: res.data.orderId,
            userId: userId,
            userType: finalUserType
          });
          
          // Open Cashfree
          openCashfreePayment(paymentSessionId, res.data.amount);
        } else {
          console.error("❌ Invalid payment session ID format:", res.data);
          setMessage("❌ Invalid payment session. Please try again.");
        }
      } else {
        setMessage("❌ " + (res.data.error || "Payment setup failed"));
      }
    } catch (err) {
      console.error("Payment error:", err.response?.data || err.message);
      
      if (err.response?.data?.code === 'payment_session_id_invalid') {
        setMessage("❌ Payment session expired. Please try creating a new payment.");
      } else {
        setMessage("⚠️ Payment setup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Cashfree integration
  const openCashfreePayment = (paymentSessionId, amount) => {
    if (typeof window.Cashfree === "undefined") {
      const script = document.createElement('script');
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.onload = () => {
        initCashfree(paymentSessionId, amount);
      };
      script.onerror = () => {
        setMessage("❌ Failed to load payment gateway. Please try again.");
      };
      document.head.appendChild(script);
    } else {
      initCashfree(paymentSessionId, amount);
    }
  };

  const initCashfree = (paymentSessionId, amount) => {
    try {
      const isProd = import.meta.env.VITE_CASHFREE_ENV === "PROD";
      const mode = isProd ? "production" : "sandbox";
      
      console.log("🔧 Cashfree Config:", {
        mode: mode,
        paymentSessionId: paymentSessionId?.substring(0, 50) + "...",
        length: paymentSessionId?.length
      });

      if (!paymentSessionId || !paymentSessionId.startsWith('session_')) {
        setMessage("❌ Invalid payment session ID format");
        return;
      }

      const cashfree = new window.Cashfree({
        mode: mode,
      });

      console.log("🔧 Opening Cashfree checkout...");
      
      cashfree.checkout({
        paymentSessionId: paymentSessionId,
        redirectTarget: "_self",
        onPaymentSuccess: async function(data) {
          console.log("✅ Payment Success Callback FIRED!", data);
          await verifyAndUpdateSubscription();
        },
        onPaymentFailure: function(data) {
          console.log("❌ Payment Failed:", data);
          setMessage("❌ Payment failed. Please try again.");
        },
        onEvent: function(event) {
          console.log("🔔 Cashfree Event:", event.eventName);
        }
      }).then(result => {
        console.log("✅ Cashfree opened successfully");
        setMessage("💳 Payment window opened. Complete payment to renew subscription.");
      }).catch(error => {
        console.error("Cashfree checkout error:", error);
        setMessage("❌ Failed to open payment: " + (error.message || "Unknown error"));
      });
      
    } catch (error) {
      console.error("Cashfree init error:", error);
      setMessage("❌ Payment gateway error: " + error.message);
    }
  };

  // ✅ COMPLETELY FIXED: Payment verification with auto-detection
  const verifyAndUpdateSubscription = async () => {
    try {
      setLoading(true);
      setMessage("Verifying payment and updating subscription...");
      
      // Get stored order info
      const orderId = localStorage.getItem("renewalOrderId") || currentOrderId;
      const userId = localStorage.getItem("renewalUserId");
      let userType = localStorage.getItem("renewalUserType");
      
      console.log("🔍 Starting verification with:", { orderId, userId, userType });
      
      // ✅ CRITICAL FIX 1: Auto-detect userType from orderId
      if (!userType && orderId) {
        if (orderId.startsWith('RENEW_SERVICE_')) {
          userType = 'service-provider';
          console.log("🔄 Auto-detected: SERVICE PROVIDER from order ID");
          localStorage.setItem("renewalUserType", userType);
        } else if (orderId.startsWith('RENEW_AGENT_')) {
          userType = 'agent';
          console.log("🔄 Auto-detected: AGENT from order ID");
          localStorage.setItem("renewalUserType", userType);
        }
      }
      
      // ✅ CRITICAL FIX 2: Convert 'service' to 'service-provider'
      if (userType === 'service') {
        userType = 'service-provider';
        console.log("🔄 Fixed userType from 'service' to 'service-provider'");
        localStorage.setItem("renewalUserType", userType);
      }
      
      console.log("🔍 Final values for verification:", { orderId, userId, userType });
      
      if (!orderId || !userId || !userType) {
        console.error("❌ Missing data:", { orderId, userId, userType });
        setMessage("❌ Missing payment information. Please contact support.");
        return;
      }
      
      // ✅ CRITICAL FIX 3: Use correct endpoint
      const endpoint = userType === 'agent' 
        ? `/agents/renewal/verify-payment`
        : `/service-provider/renewal/verify-payment`;
      
      console.log("📤 Calling endpoint:", endpoint);
      
      const res = await api.post(endpoint, {
        orderId: orderId,
        userId: userId,
        userType: userType
      });
      
      console.log("✅ Verification response:", res.data);
      
      if (res.data.success) {
        // Clear localStorage and redirect
        localStorage.clear();
        localStorage.setItem("renewalSuccess", "true");
        localStorage.setItem("renewalEmail", userEmail);
        
        setMessage("✅ Payment successful! Subscription renewed.");
        
        setTimeout(() => {
          navigate('/login', { 
            replace: true,
            state: { 
              renewalSuccess: true,
              email: userEmail,
              message: 'Subscription renewed successfully. Please login again.'
            }
          });
        }, 2000);
      } else {
        setMessage(`❌ ${res.data.error || 'Payment verification failed'}`);
      }
    } catch (err) {
      console.error("❌ Verification error:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url
      });
      
      if (err.response?.status === 400) {
        setMessage(`❌ ${err.response.data?.error || 'Payment not verified yet. Please wait a moment and try again.'}`);
      } else {
        setMessage("❌ Could not verify payment. Please contact support.");
      }
    } finally {
      setLoading(false);
    }
  };

  const sendPaymentSuccessEmail = async (email, name, amount) => {
    try {
      const res = await api.post("/send-payment-email", {
        to: email,
        subject: "Subscription Renewal Successful - RealEstate 24X7",
        name: name,
        amount: amount,
        plan: "Subscription Renewal",
        paymentDate: new Date().toLocaleDateString(),
        expiresDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
      });
      
      console.log("📧 Payment email sent:", res.data);
    } catch (err) {
      console.error("Failed to send email:", err);
    }
  };

  const clearAndRestart = () => {
    clearExistingTokens();
    localStorage.removeItem("renewalUser");
    localStorage.removeItem("renewalOrderId");
    localStorage.removeItem("renewalUserId");
    localStorage.removeItem("renewalUserType");
    localStorage.removeItem("renewalSuccess");
    localStorage.removeItem("renewalEmail");
    
    setEmailVerified(false);
    setUserInfo(null);
    setUserId("");
    setMessage("");
    setUserEmail("");
    setUserType("");
    setCurrentOrderId("");
  };

  const agentPlans = [
    { name: 'Basic', price: 2000, duration: '30 days' },
    { name: 'Premium', price: 5000, duration: '90 days' }
  ];

  const serviceProviderPlans = [
    { name: 'Basic', price: 1500, duration: '30 days' },
    { name: 'Premium', price: 4000, duration: '90 days' }
  ];

  const plans = userType === 'agent' ? agentPlans : serviceProviderPlans;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Subscription Renewal</h1>
        <p style={styles.subtitle}>
          {userType === 'agent' 
            ? 'Renew your agent subscription' 
            : 'Renew your service provider subscription'}
        </p>
        <p style={{ fontSize: '14px', opacity: 0.8, marginTop: '10px' }}>
          ⚠️ This is a standalone renewal page. No login required.
        </p>
      </div>
      
      <div style={styles.card}>
        {/* Debug Info - Show in development only */}
        {process.env.NODE_ENV === 'development' && (
          <div style={styles.debugInfo}>
            <p><strong>Debug Info:</strong></p>
            <p>Email: {userEmail || 'Not set'}</p>
            <p>User Type: {userType || 'Not set'}</p>
            <p>User ID: {userId || 'Not set'}</p>
            <p>Verified: {emailVerified ? '✅' : '❌'}</p>
            <p>Order ID: {currentOrderId || 'Not set'}</p>
          </div>
        )}

        {/* User Info Display */}
        {userInfo && emailVerified && (
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {userInfo.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3>{userInfo.name}</h3>
              <p><strong>Type:</strong> {userInfo.userType}</p>
              <p><strong>Email:</strong> {userEmail}</p>
              {userInfo.agentId && <p><strong>Agent ID:</strong> {userInfo.agentId}</p>}
              {userInfo.phone && <p><strong>Phone:</strong> {userInfo.phone}</p>}
            </div>
          </div>
        )}

        {/* Step 1: Email Verification */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <span style={styles.stepNumber}>1</span> Account Verification
          </h3>
          
          {!emailVerified ? (
            <>
              <div style={styles.inputGroup}>
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
              </div>
              
              <div style={styles.userTypeSelection}>
                <p style={styles.selectionLabel}>I am a:</p>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="userType"
                      value="agent"
                      checked={userType === 'agent'}
                      onChange={(e) => setUserType(e.target.value)}
                      style={styles.radioInput}
                      disabled={loading}
                    />
                    <span>Property Agent</span>
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="userType"
                      value="service-provider"
                      checked={userType === 'service-provider'}
                      onChange={(e) => setUserType(e.target.value)}
                      style={styles.radioInput}
                      disabled={loading}
                    />
                    <span>Service Provider</span>
                  </label>
                </div>
              </div>
              
              <button 
                onClick={verifyEmail}
                disabled={loading || !userEmail || !userType}
                style={{
                  ...styles.verifyButton,
                  opacity: (!userEmail || !userType) ? 0.6 : 1,
                  cursor: (!userEmail || !userType) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Verifying...' : 'Verify Account'}
              </button>
              
              <button 
                onClick={detectUserFromLocalStorage}
                style={styles.autoDetectButton}
                disabled={loading}
              >
                Auto-detect from my session
              </button>
            </>
          ) : (
            <div style={styles.verifiedStatus}>
              <div style={styles.verifiedIcon}>✓</div>
              <div>
                <h4>✅ Account Verified</h4>
                <p>Your account has been verified. You can now select a subscription plan.</p>
                <button 
                  onClick={() => {
                    setEmailVerified(false);
                    setMessage("");
                  }}
                  style={styles.changeButton}
                  disabled={loading}
                >
                  Change Account
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Payment Plans */}
        {emailVerified && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <span style={styles.stepNumber}>2</span> Choose Your Plan
            </h3>
            
            {/* Payment Method Selection */}
            <div style={styles.paymentMethodSection}>
              <p style={styles.paymentMethodLabel}>Select Payment Method:</p>
              <div style={styles.paymentMethodOptions}>
                <label style={styles.paymentMethodOption}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cashfree"
                    checked={paymentMethod === 'cashfree'}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setShowUpiOptions(e.target.value === 'cashfree');
                    }}
                    disabled={loading}
                  />
                  <span style={styles.paymentMethodText}>Cashfree (UPI/Card/NetBanking)</span>
                </label>
                <label style={styles.paymentMethodOption}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="demo"
                    checked={paymentMethod === 'demo'}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setShowUpiOptions(false);
                    }}
                    disabled={loading}
                  />
                  <span style={styles.paymentMethodText}>Demo Mode (Testing Only)</span>
                </label>
              </div>
            </div>

            {/* UPI Options for Cashfree */}
            {showUpiOptions && (
              <div style={styles.upiOptions}>
                <p style={styles.upiLabel}>Preferred UPI App:</p>
                <div style={styles.upiApps}>
                  {['gpay', 'phonepe', 'paytm', 'bhim'].map(app => (
                    <button
                      key={app}
                      onClick={() => setSelectedUpiApp(app)}
                      style={{
                        ...styles.upiAppButton,
                        background: selectedUpiApp === app ? '#4f46e5' : '#f1f5f9',
                        color: selectedUpiApp === app ? 'white' : '#374151'
                      }}
                      disabled={loading}
                    >
                      {app === 'gpay' && 'GPay'}
                      {app === 'phonepe' && 'PhonePe'}
                      {app === 'paytm' && 'Paytm'}
                      {app === 'bhim' && 'BHIM'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.plansGrid}>
              {plans.map((plan, index) => (
                <div key={index} style={styles.planCard}>
                  {plan.name === 'Premium' && (
                    <div style={styles.popularBadge}>MOST POPULAR</div>
                  )}
                  
                  <h4 style={styles.planTitle}>{plan.name} Plan</h4>
                  <div style={styles.planPrice}>
                    <span style={styles.currency}>₹</span>
                    <span style={styles.price}>{plan.price}</span>
                    <span style={styles.duration}>/{plan.duration}</span>
                  </div>
                  
                  <button 
                    onClick={() => handlePayment(plan.name.toLowerCase(), plan.price)}
                    disabled={loading}
                    style={{
                      ...styles.payButton,
                      background: plan.name === 'Premium' 
                        ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' 
                        : 'linear-gradient(135deg, #10b981, #059669)'
                    }}
                  >
                    {loading ? 'Processing...' : `Renew ${plan.name} Plan`}
                  </button>
                </div>
              ))}
            </div>
            
            <div style={styles.paymentNote}>
              <p><strong>Note:</strong> After payment, a confirmation email will be sent to {userEmail}</p>
              <p>All major payment methods accepted: UPI, Credit/Debit Cards, Net Banking</p>
              <p style={{ marginTop: '10px', fontSize: '13px', color: '#6b7280' }}>
                <strong>Environment:</strong> {import.meta.env.VITE_CASHFREE_ENV === "PROD" ? "Production" : "Sandbox"}
              </p>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div style={{
            ...styles.messageBox,
            background: message.includes("✅") ? "#d1fae5" : 
                       message.includes("⚠️") ? "#fef3c7" : 
                       message.includes("❌") ? "#fee2e2" : "#f0f9ff",
            color: message.includes("✅") ? "#065f46" : 
                   message.includes("⚠️") ? "#92400e" : 
                   message.includes("❌") ? "#dc2626" : "#0369a1",
          }}>
            {message}
          </div>
        )}

        {/* Action Buttons */}
        <div style={styles.actionButtons}>
          <button 
            onClick={() => navigate("/login")} 
            style={styles.backButton}
            disabled={loading}
          >
            ← Back to Login
          </button>
          
          <button 
            onClick={clearAndRestart}
            style={styles.clearButton}
            disabled={loading}
          >
            Clear & Restart
          </button>
        </div>

        {/* Support */}
        <div style={styles.supportSection}>
          <p>Need help with payment? Contact: payments@realestate24x7.com</p>
          <p style={styles.supportNote}>
            Payment confirmation email will be sent within 5 minutes. 
            {import.meta.env.VITE_CASHFREE_ENV !== "PROD" && " Using Sandbox mode for testing."}
          </p>
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

  header: {
    textAlign: "center",
    marginBottom: "30px",
    color: "white",
  },

  title: {
    fontSize: "42px",
    fontWeight: "900",
    marginBottom: "10px",
    letterSpacing: "-0.5px",
    background: "linear-gradient(to right, #fff, #e0e7ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  subtitle: {
    fontSize: "18px",
    opacity: 0.9,
    maxWidth: "600px",
    lineHeight: "1.5",
  },

  card: {
    background: "white",
    borderRadius: "24px",
    padding: "40px",
    boxShadow: "0 25px 70px rgba(0,0,0,0.3)",
    maxWidth: "800px",
    width: "100%",
  },

  debugInfo: {
    background: "#f0f9ff",
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontSize: "14px",
    color: "#0369a1",
  },

  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
    padding: "20px",
    borderRadius: "16px",
    marginBottom: "30px",
    border: "1px solid #e2e8f0",
  },

  avatar: {
    width: "60px",
    height: "60px",
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontSize: "24px",
    fontWeight: "bold",
  },

  section: {
    marginBottom: "40px",
    paddingBottom: "30px",
    borderBottom: "1px solid #e5e7eb",
  },

  sectionTitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#111827",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  stepNumber: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    background: "#4f46e5",
    color: "white",
    borderRadius: "50%",
    fontSize: "16px",
    fontWeight: "700",
  },

  inputGroup: {
    marginBottom: "20px",
  },

  input: {
    width: "100%",
    padding: "14px 18px",
    borderRadius: "12px",
    border: "2px solid #e5e7eb",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
  },

  userTypeSelection: {
    marginBottom: "25px",
  },

  selectionLabel: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "12px",
  },

  radioGroup: {
    display: "flex",
    gap: "20px",
  },

  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "15px",
    color: "#4b5563",
    cursor: "pointer",
    padding: "10px 16px",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    flex: 1,
  },

  radioInput: {
    width: "18px",
    height: "18px",
    accentColor: "#4f46e5",
    cursor: "pointer",
  },

  verifyButton: {
    width: "100%",
    padding: "16px",
    background: "linear-gradient(135deg, #4f46e5, #3730a3)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "20px",
  },

  autoDetectButton: {
    width: "100%",
    padding: "12px",
    background: "#e2e8f0",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "10px",
  },

  verifiedStatus: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    background: "#d1fae5",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #10b981",
  },

  verifiedIcon: {
    width: "40px",
    height: "40px",
    background: "#10b981",
    color: "white",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "bold",
    flexShrink: 0,
  },

  changeButton: {
    background: "transparent",
    border: "1px solid #dc2626",
    color: "#dc2626",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "10px",
  },

  paymentMethodSection: {
    marginBottom: "25px",
    padding: "20px",
    background: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },

  paymentMethodLabel: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "15px",
  },

  paymentMethodOptions: {
    display: "flex",
    gap: "20px",
  },

  paymentMethodOption: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "15px",
    color: "#4b5563",
    cursor: "pointer",
    padding: "12px 20px",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    flex: 1,
    background: "white",
  },

  paymentMethodText: {
    fontWeight: "500",
  },

  upiOptions: {
    marginBottom: "25px",
    padding: "20px",
    background: "#f0f9ff",
    borderRadius: "12px",
    border: "1px solid #bae6fd",
  },

  upiLabel: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#0369a1",
    marginBottom: "15px",
  },

  upiApps: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: "10px",
  },

  upiAppButton: {
    padding: "12px",
    border: "2px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },

  plansGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "25px",
    marginBottom: "30px",
  },

  planCard: {
    border: "2px solid #e5e7eb",
    borderRadius: "16px",
    padding: "30px",
    position: "relative",
    background: "white",
  },

  popularBadge: {
    position: "absolute",
    top: "-12px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
    color: "white",
    padding: "6px 20px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
  },

  planTitle: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#111827",
    marginBottom: "15px",
    textAlign: "center",
  },

  planPrice: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
    gap: "5px",
    marginBottom: "25px",
  },

  currency: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#4f46e5",
  },

  price: {
    fontSize: "42px",
    fontWeight: "900",
    color: "#111827",
    lineHeight: "1",
  },

  duration: {
    fontSize: "16px",
    color: "#6b7280",
    fontWeight: "500",
  },

  payButton: {
    width: "100%",
    padding: "16px",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  },

  paymentNote: {
    background: "#fef3c7",
    border: "1px solid #f59e0b",
    borderRadius: "12px",
    padding: "20px",
    color: "#92400e",
    fontSize: "14px",
  },

  messageBox: {
    padding: "18px 20px",
    borderRadius: "12px",
    marginBottom: "25px",
    fontWeight: "600",
  },

  actionButtons: {
    display: "flex",
    gap: "15px",
    marginTop: "30px",
  },

  backButton: {
    flex: 1,
    padding: "14px",
    background: "white",
    border: "2px solid #e5e7eb",
    color: "#6b7280",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },

  clearButton: {
    flex: 1,
    padding: "14px",
    background: "#fca5a5",
    border: "none",
    color: "#7f1d1d",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },

  supportSection: {
    textAlign: "center",
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

// Add Cashfree SDK loading and styles
const styleTag = document.createElement('style');
styleTag.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  input:focus {
    border-color: #4f46e5 !important;
    box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1) !important;
  }
  
  .radioLabel:hover {
    border-color: #4f46e5 !important;
    background-color: #f8fafc;
  }
  
  .radioLabel input:checked ~ span {
    font-weight: 700;
    color: #4f46e5;
  }
  
  .paymentMethodOption:hover {
    border-color: #4f46e5 !important;
  }
  
  .paymentMethodOption input:checked ~ span {
    font-weight: 700;
    color: #4f46e5;
  }
  
  .upiAppButton:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .verifyButton:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3);
  }
  
  .planCard:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
  }
  
  .payButton:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }
  
  .backButton:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }
  
  .clearButton:hover {
    background: #f87171;
  }
`;
document.head.appendChild(styleTag);