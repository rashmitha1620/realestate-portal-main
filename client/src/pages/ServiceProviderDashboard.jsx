import React, { useEffect, useState } from "react";
import { ServiceProviderAPI } from "../api/apiService";
import { useNavigate } from "react-router-dom";
import { fixMediaUrl } from "../utils/fixMediaUrl";

export default function ServiceProviderDashboard() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

        // Get services
        const res = await ServiceProviderAPI.myServices();
        setServices(res.data?.services || res.data || []);


        // Get subscription status
        if (storedUser._id) {
          try {
            const subRes = await ServiceProviderAPI.getSubscriptionStatus(storedUser._id);
            setSubscription(subRes.data.subscription);
          } catch (subErr) {
            console.log("Subscription status not available:", subErr);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const onEdit = (s) => {
    localStorage.setItem("editService", JSON.stringify(s));
    navigate(`/service/edit/${s._id}`);
  };

  const onDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      await ServiceProviderAPI.deleteService(id);
      setServices((prev) => prev.filter((p) => p._id !== id));
      alert("Service deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("Delete failed. Please try again.");
    }
  };

 const handleViewDetails = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user._id) return alert("User not found");
  navigate(`/service-provider/${user._id}`);
};


  const handleRenewSubscription = () => {
    navigate("/subscription-renew");
  };

  if (loading) return (
    <div style={styles.loadingContainer}>
      <h3 style={styles.loadingText}>Loading Services...</h3>
    </div>
  );

  return (
    <div style={styles.page}>
      {/* Back Button */}
      <button onClick={() => navigate(-1)} style={styles.backBtn}>
        ← Back
      </button>

      {/* Header Section */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Your Services Dashboard</h1>
          <p style={styles.subtitle}>Manage all your posted services</p>
        </div>
        <div style={styles.headerButtons}>
          <button 
            onClick={() => navigate("/service/new")} 
            style={styles.primaryButton}
          >
            ➕ Post New Service
          </button>
          <button 
            onClick={handleViewDetails}
            style={styles.secondaryButton}
          >
            👤 View Profile
          </button>
        </div>
      </div>

      {/* Subscription Status Banner */}
      {subscription && (
        <div style={{
          ...styles.subscriptionBanner,
          background: subscription.active 
            ? (subscription.daysRemaining <= 10 
                ? "linear-gradient(135deg, #f59e0b20, #f59e0b10)"
                : "linear-gradient(135deg, #16a34a20, #16a34a10)")
            : "linear-gradient(135deg, #dc262620, #dc262610)",
          borderLeft: `4px solid ${subscription.active 
            ? (subscription.daysRemaining <= 10 ? "#f59e0b" : "#16a34a")
            : "#dc2626"}`
        }}>
          <div style={styles.subscriptionContent}>
            <div>
              <h3 style={styles.subscriptionTitle}>
                {subscription.active 
                  ? (subscription.daysRemaining <= 10 ? "⚠️ Subscription Expiring Soon" : "✅ Active Subscription")
                  : "❌ Subscription Expired"}
              </h3>
              <p style={styles.subscriptionText}>
                {subscription.expiresAt && (
                  <>
                    {subscription.active ? "Valid until" : "Expired on"}:{" "}
                    <b>{new Date(subscription.expiresAt).toLocaleDateString('en-IN')}</b>
                  </>
                )}
                {subscription.daysRemaining > 0 && (
                  <span style={{ marginLeft: '15px' }}>
                    • <b>{subscription.daysRemaining}</b> days remaining
                  </span>
                )}
              </p>
            </div>
            <button 
              onClick={handleRenewSubscription}
              style={{
                ...styles.renewButton,
                background: !subscription.active 
                  ? "#dc2626" 
                  : subscription.daysRemaining <= 10 
                    ? "#f59e0b" 
                    : "#16a34a"
              }}
            >
              {!subscription.active 
                ? "💳 Renew Subscription" 
                : subscription.daysRemaining <= 10 
                  ? "⚠️ Renew Now" 
                  : "⏳ Extend Early"}
            </button>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{services.length}</h3>
          <p style={styles.statLabel}>Total Services</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>
            ₹{services.reduce(
  (sum, service) => sum + Number(service.price || 0),
  0
)
}
          </h3>
          <p style={styles.statLabel}>Total Value</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>
            {new Set(services.filter(s => s.category).map(s => s.category)).size}
          </h3>
          <p style={styles.statLabel}>Categories</p>
        </div>
      </div>

      {/* Services List */}
      <div style={styles.servicesContainer}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Your Services ({services.length})</h2>
          <p style={styles.sectionDescription}>
            Click on a service to view details or manage it
          </p>
        </div>

        {services.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <h3 style={styles.emptyTitle}>No Services Posted Yet</h3>
            <p style={styles.emptyText}>
              Start by posting your first service to get discovered by customers
            </p>
            <button 
              onClick={() => navigate("/service/new")}
              style={styles.emptyButton}
            >
              ➕ Post Your First Service
            </button>
          </div>
        ) : (
          <div style={styles.servicesGrid}>
            {services.map((service) => (
              <div key={service._id} style={styles.serviceCard}>
                {service.images && service.images.length > 0 && (
                  <div style={styles.serviceImageContainer}>
                    <img
  src={fixMediaUrl(service.images[0])}
  alt={service.title}
  style={styles.serviceImage}
  onError={(e) => {
    e.target.onerror = null;
    e.target.src = "/placeholder-service.png";
  }}
/>

                    <div style={styles.serviceBadge}>
                      {service.status || "Active"}
                    </div>
                  </div>
                )}
                
                <div style={styles.serviceContent}>
                  <div style={styles.serviceHeader}>
                    <h3 style={styles.serviceTitle}>{service.title}</h3>
                    <span style={styles.servicePrice}>₹{service.price}</span>
                  </div>
                  
                  <p style={styles.serviceDescription}>
                    {service.description?.substring(0, 100)}
                    {service.description?.length > 100 ? "..." : ""}
                  </p>
                  
                  <div style={styles.serviceMeta}>
                    <span style={styles.serviceCategory}>{service.category}</span>
                    <span style={styles.serviceDate}>
                      Posted: {new Date(service.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div style={styles.serviceActions}>
                    <button 
                      onClick={() => navigate(`/service/${service._id}`)}
                      style={styles.viewButton}
                    >
                      👁️ View
                    </button>
                    <button 
                      onClick={() => onEdit(service)}
                      style={styles.editButton}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={() => onDelete(service._id)}
                      style={styles.deleteButton}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      <div style={styles.quickActions}>
        <h3 style={styles.quickActionsTitle}>Quick Actions</h3>
        <div style={styles.actionButtons}>
          <button 
            onClick={() => navigate("/service-upload")}
            style={styles.actionButton}
          >
            ➕ Add New Service
          </button>
          <button 
            onClick={handleRenewSubscription}
            style={styles.actionButton}
          >
            💳 Manage Subscription
          </button>
          <button 
            onClick={handleViewDetails}
            style={styles.actionButton}
          >
            👤 View Profile
          </button>
          <button 
            onClick={() => navigate("/")}
            style={styles.actionButton}
          >
            🏠 Go to Home
          </button>
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
    padding: "30px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    background: "#f8fafc",
    minHeight: "100vh",
  },

  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#f8fafc",
  },

  loadingText: {
    fontSize: "24px",
    color: "#4f46e5",
    fontWeight: "600",
  },

  backBtn: {
    padding: "10px 20px",
    background: "white",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "25px",
    transition: "all 0.2s ease",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "30px",
    flexWrap: "wrap",
    gap: "20px",
  },

  title: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#111827",
    margin: "0 0 8px 0",
  },

  subtitle: {
    fontSize: "16px",
    color: "#6b7280",
    margin: 0,
  },

  headerButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  primaryButton: {
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

  secondaryButton: {
    padding: "12px 24px",
    background: "white",
    border: "2px solid #8b1515",
    color: "#8b1515",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    transition: "all 0.3s ease",
  },

  subscriptionBanner: {
    padding: "20px 25px",
    borderRadius: "12px",
    marginBottom: "30px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },

  subscriptionContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
  },

  subscriptionTitle: {
    margin: "0 0 5px 0",
    fontSize: "18px",
    fontWeight: "700",
  },

  subscriptionText: {
    margin: 0,
    fontSize: "15px",
    color: "#4b5563",
  },

  renewButton: {
    padding: "10px 20px",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s ease",
    whiteSpace: "nowrap",
  },

  statsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "40px",
  },

  statCard: {
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    textAlign: "center",
    transition: "transform 0.3s ease",
  },

  statNumber: {
    fontSize: "36px",
    fontWeight: "800",
    color: "#8b1515",
    margin: "0 0 8px 0",
  },

  statLabel: {
    fontSize: "15px",
    color: "#6b7280",
    fontWeight: "500",
    margin: 0,
  },

  servicesContainer: {
    background: "white",
    borderRadius: "12px",
    padding: "30px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    marginBottom: "30px",
  },

  sectionHeader: {
    marginBottom: "30px",
  },

  sectionTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 8px 0",
  },

  sectionDescription: {
    fontSize: "15px",
    color: "#6b7280",
    margin: 0,
  },

  emptyState: {
    textAlign: "center",
    padding: "50px 20px",
    background: "#f9fafb",
    borderRadius: "12px",
    border: "2px dashed #d1d5db",
  },

  emptyIcon: {
    fontSize: "64px",
    marginBottom: "20px",
  },

  emptyTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#374151",
    margin: "0 0 10px 0",
  },

  emptyText: {
    fontSize: "15px",
    color: "#6b7280",
    margin: "0 0 25px 0",
    maxWidth: "400px",
    marginLeft: "auto",
    marginRight: "auto",
  },

  emptyButton: {
    padding: "12px 30px",
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
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: "25px",
  },

  serviceCard: {
    background: "white",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    border: "1px solid #e5e7eb",
  },

  serviceImageContainer: {
    position: "relative",
    height: "200px",
    overflow: "hidden",
  },

  serviceImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  serviceBadge: {
    position: "absolute",
    top: "12px",
    right: "12px",
    background: "rgba(139, 21, 21, 0.9)",
    color: "white",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },

  serviceContent: {
    padding: "20px",
  },

  serviceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },

  serviceTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 10px 0 0",
    flex: 1,
  },

  servicePrice: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#8b1515",
    whiteSpace: "nowrap",
  },

  serviceDescription: {
    fontSize: "14px",
    color: "#6b7280",
    lineHeight: "1.5",
    marginBottom: "15px",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  serviceMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "15px",
    borderBottom: "1px solid #e5e7eb",
  },

  serviceCategory: {
    fontSize: "13px",
    color: "#8b1515",
    background: "#fef2f2",
    padding: "4px 12px",
    borderRadius: "20px",
    fontWeight: "500",
  },

  serviceDate: {
    fontSize: "13px",
    color: "#9ca3af",
  },

  serviceActions: {
    display: "flex",
    gap: "10px",
  },

  viewButton: {
    flex: 1,
    padding: "8px 12px",
    background: "#f3f4f6",
    border: "1px solid #d1d5db",
    color: "#374151",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },

  editButton: {
    flex: 1,
    padding: "8px 12px",
    background: "#fef3c7",
    border: "1px solid #f59e0b",
    color: "#92400e",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },

  deleteButton: {
    flex: 1,
    padding: "8px 12px",
    background: "#fee2e2",
    border: "1px solid #dc2626",
    color: "#dc2626",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },

  quickActions: {
    background: "white",
    borderRadius: "12px",
    padding: "25px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },

  quickActionsTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 20px 0",
  },

  actionButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
  },

  actionButton: {
    padding: "10px 20px",
    background: "white",
    border: "2px solid #8b1515",
    color: "#8b1515",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s ease",
  },
};

// Add hover effects with style tag
const styleTag = document.createElement('style');
styleTag.innerHTML = `
  .backBtn:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
  
  .primaryButton:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(139, 21, 21, 0.2);
  }
  
  .secondaryButton:hover {
    background: #8b1515;
    color: white;
  }
  
  .renewButton:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
  
  .statCard:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
  }
  
  .serviceCard:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.12);
  }
  
  .emptyButton:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(139, 21, 21, 0.2);
  }
  
  .viewButton:hover {
    background: #e5e7eb;
  }
  
  .editButton:hover {
    background: #fde68a;
  }
  
  .deleteButton:hover {
    background: #fecaca;
  }
  
  .actionButton:hover {
    background: #8b1515;
    color: white;
    transform: translateY(-2px);
  }
`;
document.head.appendChild(styleTag);