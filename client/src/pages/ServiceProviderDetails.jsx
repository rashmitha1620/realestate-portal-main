// client/src/pages/ServiceProviderDetails.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { fixMediaUrl } from "../utils/fixMediaUrl";


export default function ServiceProviderDetails() {
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        // 1️⃣ Load logged-in provider
        const providerRes = await api.get("/service-provider/me");
        setProvider(providerRes.data);

        // 2️⃣ Load provider services
        const serviceRes = await api.get("/service-provider/my-services");
        setServices(serviceRes.data.services || serviceRes.data || []);

        // 3️⃣ Load subscription status
        const subRes = await api.get(
          `/payments/subscription/status/provider/${providerRes.data._id}`
        );
        setSubscription(subRes.data.subscription);
      } catch (err) {
        console.error("Failed to load provider details:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <h3 style={styles.loadingText}>Loading...</h3>
      </div>
    );
  }

  if (!provider) {
    return (
      <div style={styles.errorContainer}>
        <h3 style={styles.errorText}>Provider not found</h3>
        <button 
          onClick={() => navigate(-1)}
          style={styles.backBtn}
        >
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={styles.backBtn}
      >
        ← Back
      </button>

      {/* Profile Card Banner */}
      <div style={styles.banner}>
        <div style={styles.bannerOverlay}></div>
        <div style={styles.profileCard}>
          <div style={styles.avatar}>
            {provider.name?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div style={styles.profileInfo}>
            <h2 style={styles.name}>{provider.name}</h2>
            
            <div style={styles.profileDetail}>
              <span style={styles.detailIcon}>📧</span>
              <p style={styles.email}>{provider.email}</p>
            </div>
            
            <div style={styles.profileDetail}>
              <span style={styles.detailIcon}>📱</span>
              <p style={styles.phone}>{provider.phone}</p>
            </div>
            
            <div style={styles.profileDetail}>
              <span style={styles.detailIcon}>🏷️</span>
              <p style={styles.category}>
                Category: <b>{provider.serviceCategory}</b>
              </p>
            </div>
            
            <div style={styles.profileDetail}>
              <span style={styles.detailIcon}>⚙️</span>
              <p style={styles.services}>
                Services: <b>{provider.serviceTypes?.join(", ") || "None"}</b>
              </p>
            </div>
            
            <div style={styles.profileDetail}>
              <span style={styles.detailIcon}>📊</span>
              <p style={styles.status}>
                Status:{" "}
                <b style={{ 
                  color: provider.status === "active" ? "#16a34a" : "#dc2626",
                  fontSize: "15px"
                }}>
                  {provider.status?.toUpperCase()}
                </b>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Status Card */}
      {subscription && (
        <div style={{
          ...styles.subscriptionCard,
          background: subscription.active ? 
            `linear-gradient(135deg, #16a34a15, #16a34a05)` : 
            `linear-gradient(135deg, #dc262615, #dc262605)`,
          border: `2px solid ${subscription.active ? '#16a34a30' : '#dc262630'}`
        }}>
          <div style={styles.subscriptionContent}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ fontSize: "24px" }}>{subscription.active ? "✅" : "❌"}</span>
                <h3 style={{
                  margin: 0,
                  color: subscription.active ? "#16a34a" : "#dc2626",
                  fontSize: "20px",
                  fontWeight: "700"
                }}>
                  {subscription.active ? "Active Subscription" : "Subscription Expired"}
                </h3>
              </div>
              
              {subscription.expiresAt && (
                <p style={styles.subscriptionMessage}>
                  {subscription.active ? "Valid until" : "Expired on"}:{" "}
                  <b>{new Date(subscription.expiresAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}</b>
                </p>
              )}
              
              {subscription.daysRemaining && subscription.daysRemaining > 0 && (
                <div style={styles.subscriptionDetails}>
                  <div style={styles.subscriptionDetailItem}>
                    <span style={styles.subscriptionDetailLabel}>Days Remaining:</span>
                    <span style={{
                      ...styles.subscriptionDetailValue,
                      color: subscription.daysRemaining <= 10 ? "#f59e0b" : "#16a34a",
                      fontWeight: "700"
                    }}>
                      {subscription.daysRemaining}
                    </span>
                  </div>
                </div>
              )}
              
              {subscription.daysRemaining <= 10 && subscription.daysRemaining > 0 && (
                <div style={{
                  marginTop: "12px",
                  padding: "10px 15px",
                  background: "#fff3cd",
                  border: "1px solid #ffc107",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#856404"
                }}>
                  ⚠️ Subscription expiring soon! Renew to continue services.
                </div>
              )}
            </div>
            
            <div style={styles.subscriptionButtons}>
              <button
                onClick={() => navigate("/subscription-renew")}
                style={{
                  ...styles.renewButton,
                  background: !subscription.active || subscription.daysRemaining <= 10
                    ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                    : "linear-gradient(135deg, #16a34a, #15803d)",
                  boxShadow: !subscription.active || subscription.daysRemaining <= 10
                    ? "0 4px 8px rgba(220, 38, 38, 0.4)"
                    : "0 4px 8px rgba(22, 163, 74, 0.4)"
                }}
              >
                {!subscription.active
                  ? "💳 Renew Subscription"
                  : subscription.daysRemaining <= 10
                  ? "⚠️ Renew Now"
                  : "⏳ Extend Subscription"}
              </button>
              
              <button
                onClick={() => navigate("/service-provider-dashboard")}
                style={styles.dashboardButton}
              >
                📊 View Dashboard
              </button>
            </div>
          </div>
          
          {!subscription.active && (
            <div style={styles.subscriptionWarning}>
              <p style={{ margin: "0 0 8px 0", fontWeight: "600", color: "#dc2626" }}>
                ⚠️ Without active subscription:
              </p>
              <div style={styles.warningList}>
                <span style={styles.warningItem}>❌ Cannot add new services</span>
                <span style={styles.warningItem}>❌ Cannot edit existing services</span>
                <span style={styles.warningItem}>❌ Contact information hidden</span>
                <span style={styles.warningItem}>❌ No new service requests</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Card */}
      <div style={styles.container}>
        <div style={styles.topRow}>
          <div style={styles.statCard}>
            <h3 style={styles.statNum}>{services.length}</h3>
            <p style={styles.statLabel}>Services Uploaded</p>
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <h3 style={styles.sectionTitle}>Documents</h3>
      <div style={styles.documentsGrid}>
        <DocCard title="Aadhar" file={provider.documents?.aadhar} />
        <DocCard title="Voter ID" file={provider.documents?.voterId} />
        {provider.documents?.pan && (
          <DocCard title="PAN" file={provider.documents.pan} />
        )}
      </div>

      {/* Services Section */}
      <h3 style={styles.sectionTitle}>Uploaded Services</h3>

      {services.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No services uploaded yet.</p>
          <button 
            onClick={() => navigate("/add-service")}
            style={styles.addServiceBtn}
          >
            ➕ Add Your First Service
          </button>
        </div>
      ) : (
        <div style={styles.servicesGrid}>
          {services.map((s) => (
            <div key={s._id} style={styles.serviceCard}>
              <div style={styles.serviceHeader}>
                <h4 style={styles.serviceTitle}>{s.title}</h4>
                <p style={styles.servicePrice}>₹{s.price}</p>
              </div>
              <p style={styles.serviceDescription}>{s.description}</p>
              
              {s.images?.length > 0 && (
  <img
    src={fixMediaUrl(s.images[0])}
    alt="service"
    style={styles.serviceImage}
    onError={(e) => {
      e.target.src =
        "https://via.placeholder.com/400x300?text=Image+Not+Available";
    }}
  />
)}

              
              <div style={styles.serviceFooter}>
                <span style={styles.serviceCategory}>{s.category}</span>
                <button 
                  onClick={() => navigate(`/service/${s._id}`)}
                  style={styles.viewDetailsBtn}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------- */
/* Reusable Document Card      */
/* --------------------------- */
function DocCard({ title, file }) {
  if (!file) return null;

  return (
    <div style={styles.documentCard}>
      <b style={styles.documentTitle}>{title}</b>
      
      <img
        src={fixMediaUrl(file)}
        alt={title}
        style={styles.documentImage}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = "/no-image.png";
        }}
      />


      <div style={styles.documentOverlay}>
        <button 
          onClick={() => window.open(fixMediaUrl(file), "_blank")}
          style={styles.viewDocBtn}
        >
          🔍 View Full Size
        </button>
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

  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
  },

  loadingText: {
    textAlign: "center",
    color: "#4f46e5",
    fontSize: "24px",
    fontWeight: "600",
  },

  errorContainer: {
    padding: "50px 20px",
    textAlign: "center",
  },

  errorText: {
    color: "#dc2626",
    marginBottom: "20px",
  },

  backBtn: {
    marginBottom: "20px",
    padding: "10px 18px",
    background: "transparent",
    border: "1px solid #ccc",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "500",
    transition: "all 0.3s ease",
  },

  /* -------- Banner -------- */
  banner: {
    position: "relative",
    height: "220px",
    borderRadius: "20px",
    backgroundImage: "url('https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1500&q=80')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    marginBottom: "100px",
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
    bottom: "-70px",
    left: "40px",
    display: "flex",
    alignItems: "flex-start",
    gap: "25px",
    background: "rgba(255,255,255,0.98)",
    backdropFilter: "blur(10px)",
    padding: "25px 30px",
    borderRadius: "20px",
    boxShadow: "0 15px 40px rgba(0,0,0,0.2)",
    color: "#333",
    zIndex: 2,
    minWidth: "450px",
    border: "1px solid rgba(255,255,255,0.3)",
  },

  avatar: {
    width: "80px",
    height: "80px",
    background: "linear-gradient(135deg, #8b1515, #d32f2f)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    fontWeight: "800",
    color: "#fff",
    flexShrink: 0,
    border: "4px solid white",
    boxShadow: "0 4px 15px rgba(139, 21, 21, 0.3)",
  },

  profileInfo: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    margin: "0 0 15px 0",
    fontSize: "28px",
    fontWeight: "900",
    color: "#111",
    letterSpacing: "-0.5px",
  },

  profileDetail: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
  },

  detailIcon: {
    fontSize: "16px",
    width: "24px",
    textAlign: "center",
    color: "#8b1515",
  },

  email: {
    margin: 0,
    fontSize: "16px",
    color: "#444",
    fontWeight: "600",
  },

  phone: {
    margin: 0,
    fontSize: "16px",
    color: "#444",
    fontWeight: "600",
  },

  category: {
    margin: 0,
    fontSize: "15px",
    color: "#666",
    fontWeight: "500",
  },

  services: {
    margin: 0,
    fontSize: "15px",
    color: "#666",
    fontWeight: "500",
  },

  status: {
    margin: 0,
    fontSize: "15px",
    color: "#666",
    fontWeight: "500",
  },

  /* -------- Subscription Card -------- */
  subscriptionCard: {
    margin: "30px 0 40px 0",
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
    minWidth: "220px",
  },

  dashboardButton: {
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
    gap: "20px",
    marginBottom: "10px",
  },

  statCard: {
    flex: 1,
    padding: "25px",
    background: "#fff",
    borderRadius: "18px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    textAlign: "center",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    borderLeft: "5px solid #8b1515",
    maxWidth: "300px",
  },

  statNum: {
    margin: 0,
    fontSize: "34px",
    fontWeight: "800",
    color: "#8b1515",
  },

  statLabel: {
    marginTop: "6px",
    fontSize: "15px",
    color: "#555",
    fontWeight: "500",
  },

  /* -------- Documents Section -------- */
  sectionTitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#111",
    margin: "30px 0 20px 0",
    paddingBottom: "10px",
    borderBottom: "2px solid #e5e7eb",
  },

  documentsGrid: {
    display: "flex",
    gap: "25px",
    marginBottom: "30px",
    flexWrap: "wrap",
  },

  documentCard: {
    position: "relative",
    background: "#fff",
    padding: "15px",
    borderRadius: "12px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    width: "250px",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
  },

  documentTitle: {
    fontSize: "16px",
    color: "#8b1515",
    marginBottom: "10px",
    display: "block",
  },

  documentImage: {
    width: "100%",
    height: "200px",
    objectFit: "cover",
    borderRadius: "8px",
  },

  documentOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    transition: "opacity 0.3s ease",
    borderRadius: "12px",
  },

  viewDocBtn: {
    padding: "8px 16px",
    background: "#8b1515",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },

  /* -------- Services Section -------- */
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },

  emptyText: {
    fontSize: "16px",
    color: "#666",
    marginBottom: "20px",
  },

  addServiceBtn: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #8b1515, #d32f2f)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    transition: "all 0.3s ease",
  },

  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "25px",
    marginTop: "20px",
  },

  serviceCard: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },

  serviceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },

  serviceTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#111",
    flex: 1,
  },

  servicePrice: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
    color: "#8b1515",
    marginLeft: "15px",
  },

  serviceDescription: {
    fontSize: "14px",
    color: "#666",
    lineHeight: "1.5",
    marginBottom: "15px",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  serviceImage: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    borderRadius: "8px",
    marginBottom: "15px",
  },

  serviceFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  serviceCategory: {
    fontSize: "13px",
    color: "#666",
    background: "#f3f4f6",
    padding: "4px 10px",
    borderRadius: "20px",
  },

  viewDetailsBtn: {
    padding: "8px 16px",
    background: "transparent",
    border: "1px solid #8b1515",
    color: "#8b1515",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s ease",
  },
};

// Add hover effects
const styleTag = document.createElement('style');
styleTag.innerHTML = `
  .backBtn:hover {
    background: #f3f4f6;
    border-color: #999;
  }
  
  .statCard:hover, .serviceCard:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  }
  
  .documentCard:hover .documentOverlay {
    opacity: 1;
  }
  
  .renewButton:hover, .dashboardButton:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }
  
  .addServiceBtn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(139, 21, 21, 0.3);
  }
  
  .viewDetailsBtn:hover {
    background: #8b1515;
    color: white;
  }
`;
document.head.appendChild(styleTag);