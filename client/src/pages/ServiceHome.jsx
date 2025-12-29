import React, { useEffect, useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { fixMediaUrl } from "../utils/fixMediaUrl";

export default function ServiceHome() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // New state for tracking subscription renewal
  const [showRenewButton, setShowRenewButton] = useState(true); // You can conditionally set this based on user's subscription status

  // Filters
  const [city, setCity] = useState("All");
  const [area, setArea] = useState("All");
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [budget, setBudget] = useState("");
  const [category, setCategory] = useState("");

  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  /* ==================== LOAD SERVICES ==================== */
  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      setLoading(true);
      const res = await api.get("/services");
      const list = res.data || [];
      
      console.log("Services loaded:", list.length);
      console.log("First service image:", list[0]?.images?.[0]);
      
      setServices(list);

      // Extract unique cities
      const uniqueCities = [
        ...new Set(list.map((s) => s.city?.trim()).filter(Boolean)),
      ];
      setCities(uniqueCities);
      setError("");
    } catch (err) {
      console.error("❌ Failed to load services", err);
      setError("Failed to load services. Please try again.");
      
      // For testing, use demo data
      const demoData = getDemoServices();
      setServices(demoData);
      setCities(["Mumbai", "Delhi", "Bangalore", "Pune"]);
    } finally {
      setLoading(false);
    }
  }

  /* ==================== LOAD AREAS ==================== */
  useEffect(() => {
    if (city === "All") {
      setAreas([]);
      setArea("All");
      return;
    }

    const filtered = services.filter(
      (s) => s.city?.toLowerCase() === city.toLowerCase()
    );

    const extracted = filtered
      .map((s) =>
        s.location?.address
          ? s.location.address.split(",")[0].trim()
          : s.area?.trim()
      )
      .filter(Boolean);

    setAreas([...new Set(extracted)]);
  }, [city, services]);

  /* ==================== FILTER LOGIC ==================== */
  const filteredServices = services.filter((s) => {
    let ok = true;

    // City filter
    if (city !== "All") {
      ok = ok && s.city?.toLowerCase() === city.toLowerCase();
    }

    // Area filter
    if (area !== "All") {
      const serviceArea = s.location?.address?.split(",")[0]?.trim()?.toLowerCase() || 
                         s.area?.toLowerCase();
      ok = ok && serviceArea === area.toLowerCase();
    }

    // Keyword filter
    if (keyword.trim()) {
      const searchTerm = keyword.toLowerCase();
      const matchesTitle = s.title?.toLowerCase().includes(searchTerm);
      const matchesProvider = s.provider?.name?.toLowerCase().includes(searchTerm);
      const matchesDescription = s.description?.toLowerCase().includes(searchTerm);
      
      ok = ok && (matchesTitle || matchesProvider || matchesDescription);
    }

    // Category filter
    if (category) {
      ok = ok && s.provider?.serviceCategory === category;
    }

    // Budget filter
    const price = Number(s.price || 0);
    if (budget) {
      if (budget === "5000") ok = ok && price <= 5000;
      if (budget === "10000") ok = ok && price > 5000 && price <= 10000;
      if (budget === "25000") ok = ok && price > 10000 && price <= 25000;
      if (budget === "50000") ok = ok && price > 25000 && price <= 50000;
      if (budget === "50000plus") ok = ok && price > 50000;
    }

    return ok;
  });

  /* ==================== CATEGORY CHIPS ==================== */
  const chipCategories = [
    { name: "", label: "All", icon: "🔍", color: "#0066ff" },
    { name: "Electrician", label: "Electrician", icon: "⚡", color: "#ff9800" },
    { name: "Plumber", label: "Plumber", icon: "🔧", color: "#2196f3" },
    { name: "AC Repair", label: "AC Repair", icon: "❄️", color: "#00bcd4" },
    { name: "Carpenter", label: "Carpenter", icon: "🪚", color: "#795548" },
    { name: "Painter", label: "Painter", icon: "🎨", color: "#9c27b0" },
    { name: "Interior", label: "Interior", icon: "🏠", color: "#673ab7" },
    { name: "Architect", label: "Architect", icon: "📐", color: "#3f51b5" },
    { name: "Vastu", label: "Vastu", icon: "☯️", color: "#4caf50" },
  ];

  /* ==================== IMAGE HANDLER ==================== */
  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      return "https://via.placeholder.com/300x200/0066ff/ffffff?text=No+Image";
    }
    
    // Use the fixMediaUrl function
    return fixMediaUrl(imagePath);
  };

  /* ==================== RESET FILTERS ==================== */
  const resetFilters = () => {
    setCity("All");
    setArea("All");
    setKeyword("");
    setBudget("");
    setCategory("");
  };

  return (
    <div style={styles.page}>
      {/* ANIMATIONS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
        }
        
        .service-card {
          transition: all 0.3s ease;
        }
        
        .service-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px rgba(0, 102, 255, 0.15);
        }
        
        .service-card:hover .card-img {
          transform: scale(1.05);
        }
        
        .category-chip:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        @media (max-width: 768px) {
          .hero-title { font-size: 32px !important; }
          .search-container { flex-direction: column !important; }
          .renew-button { 
            position: static !important; 
            margin: 20px auto !important;
            width: auto !important;
          }
        }
      `}</style>

      {/* ========================= HERO ========================= */}
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Find Trusted Service Providers</h1>
        <p style={styles.heroSub}>
          AC Repair • Electrician • Plumber • Interior • Architect • Vastu & More
        </p>

        {/* Category Chips */}
        <div style={styles.chipRow}>
          {chipCategories.map((cat) => (
            <div
              key={cat.name || "all"}
              style={{
                ...styles.chip,
                background:
                  category === cat.name
                    ? `linear-gradient(90deg, ${cat.color}, ${cat.color}dd)`
                    : "rgba(255,255,255,0.15)",
                border: category === cat.name ? `2px solid ${cat.color}` : "2px solid rgba(255,255,255,0.3)",
              }}
              onClick={() => setCategory(cat.name === category ? "" : cat.name)}
              className="category-chip"
            >
              <span style={{ marginRight: "8px", fontSize: "16px" }}>{cat.icon}</span>
              {cat.label}
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div style={styles.searchContainer} className="search-container">
          <div style={styles.filterGroup}>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={styles.select}
            >
              <option value="All">📍 All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {city !== "All" && areas.length > 0 && (
            <div style={styles.filterGroup}>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                style={styles.select}
              >
                <option value="All">📌 All Areas</option>
                {areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}

          <div style={styles.filterGroup}>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              style={styles.select}
            >
              <option value="">💰 Budget</option>
              <option value="5000">Below ₹5,000</option>
              <option value="10000">₹5k – 10k</option>
              <option value="25000">₹10k – 25k</option>
              <option value="50000">₹25k – 50k</option>
              <option value="50000plus">Above ₹50k</option>
            </select>
          </div>

          <div style={styles.searchGroup}>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="🔍 Search service, provider..."
              style={styles.searchInput}
            />
            {(city !== "All" || area !== "All" || keyword || budget || category) && (
              <button
                onClick={resetFilters}
                style={styles.clearButton}
                title="Clear all filters"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Active Filters */}
        {(city !== "All" || area !== "All" || keyword || budget || category) && (
          <div style={styles.activeFilters}>
            <span style={styles.activeFiltersLabel}>Active Filters:</span>
            {city !== "All" && (
              <span style={styles.activeFilter}>
                📍 {city}
                <button onClick={() => setCity("All")}>×</button>
              </span>
            )}
            {area !== "All" && (
              <span style={styles.activeFilter}>
                📌 {area}
                <button onClick={() => setArea("All")}>×</button>
              </span>
            )}
            {category && (
              <span style={styles.activeFilter}>
                {chipCategories.find(c => c.name === category)?.icon} {category}
                <button onClick={() => setCategory("")}>×</button>
              </span>
            )}
            {budget && (
              <span style={styles.activeFilter}>
                💰 {
                  budget === "5000" ? "Under ₹5k" :
                  budget === "10000" ? "₹5k-10k" :
                  budget === "25000" ? "₹10k-25k" :
                  budget === "50000" ? "₹25k-50k" : "Above ₹50k"
                }
                <button onClick={() => setBudget("")}>×</button>
              </span>
            )}
            {keyword && (
              <span style={styles.activeFilter}>
                🔍 "{keyword}"
                <button onClick={() => setKeyword("")}>×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ========================= MAIN CONTENT ========================= */}
      <div style={styles.container}>
        {/* Renew Subscription Button - Floating on right side */}
        {showRenewButton && (
          <button
            style={styles.renewButton}
            onClick={() => navigate("/renew")}
            className="renew-button"
            title="Renew your subscription"
          >
            🔄 Renew Subscription
          </button>
        )}

        <div style={styles.headerRow}>
          <h2 style={styles.sectionTitle}>
            Popular Services
            {filteredServices.length > 0 && (
              <span style={styles.resultCount}> ({filteredServices.length} found)</span>
            )}
          </h2>
          
          <button
            onClick={() => loadServices()}
            style={styles.refreshButton}
            title="Refresh services"
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading services...</p>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>{error}</p>
            <button onClick={() => loadServices()} style={styles.retryButton}>
              Retry
            </button>
          </div>
        ) : filteredServices.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🔍</div>
            <h3 style={styles.emptyTitle}>No services found</h3>
            <p style={styles.emptyText}>
              {services.length > 0 
                ? "Try adjusting your filters or search term"
                : "No services available at the moment. Please check back later."
              }
            </p>
            {services.length > 0 && (
              <button onClick={resetFilters} style={styles.emptyButton}>
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={styles.grid}>
              {filteredServices.map((s) => {
                const imageUrl = getImageUrl(s.images?.[0]);
                const areaName = s.location?.address?.split(",")[0]?.trim() || s.area || "";

                return (
                  <div 
                    key={s._id} 
                    style={styles.card}
                    className="service-card"
                    onClick={() => navigate(`/service/${s._id}`)}
                  >
                    <div style={styles.imageContainer}>
                      <img
                        src={imageUrl}
                        alt={s.title}
                        style={styles.cardImg}
                        className="card-img"
                        onError={(e) => {
                          console.error("Image failed to load:", imageUrl);
                          // Fallback to placeholder
                          e.target.src = "https://via.placeholder.com/300x200/0066ff/ffffff?text=Service";
                        }}
                      />
                      {/* Badges */}
                      <div style={styles.badges}>
                        {s.isVerified && (
                          <span style={styles.verifiedBadge}>✓ Verified</span>
                        )}
                        {s.isPremium && (
                          <span style={styles.premiumBadge}>⭐ Premium</span>
                        )}
                      </div>
                    </div>

                    <div style={styles.cardContent}>
                      <h3 style={styles.cardTitle}>{s.title}</h3>
                      
                      <div style={styles.providerInfo}>
                        <div style={styles.providerAvatar}>
                          {s.provider?.name?.charAt(0) || "P"}
                        </div>
                        <div>
                          <div style={styles.providerName}>{s.provider?.name || "Professional"}</div>
                          <div style={styles.providerCategory}>
                            {s.provider?.serviceCategory || "Service Provider"}
                          </div>
                        </div>
                      </div>
                      
                      <div style={styles.location}>
                        <span style={styles.locationIcon}>📍</span>
                        <span style={styles.locationText}>
                          {areaName}, {s.city || "City not specified"}
                        </span>
                      </div>

                      {s.description && (
                        <p style={styles.description}>
                          {s.description.length > 80 
                            ? `${s.description.substring(0, 80)}...` 
                            : s.description
                          }
                        </p>
                      )}

                      <div style={styles.footer}>
                        <div style={styles.priceSection}>
                          <div style={styles.priceLabel}>Starting from</div>
                          <div style={styles.price}>₹ {s.price?.toLocaleString("en-IN") || "On Request"}</div>
                        </div>
                        
                        <div style={styles.rating}>
                          <span style={styles.stars}>★★★★★</span>
                          <span style={styles.ratingText}>
                            {s.rating || "4.5"} ({s.reviews || 0})
                          </span>
                        </div>
                      </div>

                      <button
                        style={styles.detailBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/service/${s._id}`);
                        }}
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Stats */}
            <div style={styles.stats}>
              <h3 style={styles.statsTitle}>Service Statistics</h3>
              <div style={styles.statsGrid}>
                <div style={styles.stat}>
                  <div style={styles.statNumber}>{services.length}</div>
                  <div style={styles.statLabel}>Total Services</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statNumber}>{new Set(services.map(s => s.provider?._id)).size}</div>
                  <div style={styles.statLabel}>Providers</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statNumber}>{cities.length}</div>
                  <div style={styles.statLabel}>Cities</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statNumber}>4.8</div>
                  <div style={styles.statLabel}>Avg Rating</div>
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div style={styles.featuresSection}>
              <h2 style={styles.sectionTitle}>Why Choose Our Services?</h2>
              <div style={styles.featuresGrid}>
                {[
                  {
                    icon: "✓",
                    title: "Verified Providers",
                    description: "All professionals are background-checked and verified"
                  },
                  {
                    icon: "💰",
                    title: "Transparent Pricing",
                    description: "No hidden charges, upfront quotes"
                  },
                  {
                    icon: "⭐",
                    title: "Quality Guarantee",
                    description: "30-day service warranty on all repairs"
                  },
                  {
                    icon: "🚚",
                    title: "Same-Day Service",
                    description: "Available in most areas"
                  },
                  {
                    icon: "📱",
                    title: "Easy Booking",
                    description: "Book in under 2 minutes"
                  },
                  {
                    icon: "👨‍👩‍👧",
                    title: "Trusted by Families",
                    description: "Serving 10,000+ happy customers"
                  },
                ].map((feature, index) => (
                  <div key={index} style={styles.featureCard}>
                    <div style={styles.featureIcon}>{feature.icon}</div>
                    <h4 style={styles.featureTitle}>{feature.title}</h4>
                    <p style={styles.featureDescription}>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div style={styles.ctaSection}>
              <h2 style={styles.ctaTitle}>Are You a Service Provider?</h2>
              <p style={styles.ctaText}>
                Join thousands of professionals and grow your business with us
              </p>
              <div style={styles.ctaButtons}>
                <button
                  style={styles.ctaButtonPrimary}
                  onClick={() => navigate("/service-provider-register")}
                >
                  Register as Provider
                </button>
                <button
                  style={styles.ctaButtonSecondary}
                  onClick={() => navigate("/service-provider-login")}
                >
                  Provider Login
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ==================== DEMO DATA ==================== */
function getDemoServices() {
  return [
    {
      _id: "1",
      title: "AC Repair & Service",
      description: "Professional AC repair, servicing, and gas refill with warranty",
      price: 1499,
      city: "Mumbai",
      area: "Andheri West",
      provider: {
        name: "Cool Air Services",
        serviceCategory: "AC Repair"
      },
      rating: 4.7,
      reviews: 128,
      isVerified: true,
      images: ["/uploads/ac-repair.jpg"]
    },
    {
      _id: "2",
      title: "Electrician Services",
      description: "Complete electrical wiring, repairs, and installations",
      price: 899,
      city: "Delhi",
      area: "Connaught Place",
      provider: {
        name: "Power Electricians",
        serviceCategory: "Electrician"
      },
      rating: 4.5,
      reviews: 89,
      isVerified: true,
      images: ["/uploads/electrician.jpg"]
    },
    {
      _id: "3",
      title: "Plumbing Solutions",
      description: "Leak repair, pipe fitting, bathroom plumbing",
      price: 699,
      city: "Bangalore",
      area: "Koramangala",
      provider: {
        name: "Aqua Plumbers",
        serviceCategory: "Plumber"
      },
      rating: 4.6,
      reviews: 76,
      isVerified: true,
      images: ["/uploads/plumber.jpg"]
    }
  ];
}

/* ==================== STYLES ==================== */
const styles = {
  page: { 
    background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)", 
    minHeight: "100vh",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    position: "relative"
  },

  // Hero Section
  hero: {
    padding: "60px 20px 80px",
    textAlign: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    position: "relative",
    animation: "fadeIn 0.8s ease-out"
  },

  heroTitle: {
    fontSize: "48px",
    fontWeight: 900,
    marginBottom: "16px",
    lineHeight: 1.2
  },

  heroSub: {
    fontSize: "18px",
    opacity: 0.9,
    maxWidth: "600px",
    margin: "0 auto 30px"
  },

  chipRow: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: "30px"
  },

  chip: {
    padding: "12px 20px",
    borderRadius: "30px",
    cursor: "pointer",
    color: "#fff",
    fontWeight: 600,
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    transition: "all 0.3s ease",
    backdropFilter: "blur(10px)"
  },

  searchContainer: {
    maxWidth: "1000px",
    margin: "0 auto",
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    justifyContent: "center"
  },

  filterGroup: {
    flex: 1,
    minWidth: "180px"
  },

  searchGroup: {
    flex: 2,
    minWidth: "250px",
    display: "flex",
    gap: "8px"
  },

  select: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "none",
    background: "rgba(255,255,255,0.15)",
    color: "white",
    fontSize: "14px",
    cursor: "pointer",
    backdropFilter: "blur(10px)",
    "&:focus": {
      outline: "none",
      boxShadow: "0 0 0 2px rgba(255,255,255,0.3)"
    },
    "& option": {
      color: "#333",
      background: "white"
    }
  },

  searchInput: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "10px",
    border: "none",
    background: "rgba(255,255,255,0.15)",
    color: "white",
    fontSize: "14px",
    backdropFilter: "blur(10px)",
    "&:focus": {
      outline: "none",
      boxShadow: "0 0 0 2px rgba(255,255,255,0.3)"
    },
    "&::placeholder": {
      color: "rgba(255,255,255,0.7)"
    }
  },

  clearButton: {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "none",
    background: "rgba(255,255,255,0.15)",
    color: "white",
    cursor: "pointer",
    fontSize: "16px",
    backdropFilter: "blur(10px)",
    "&:hover": {
      background: "rgba(255,255,255,0.25)"
    }
  },

  activeFilters: {
    maxWidth: "1000px",
    margin: "20px auto 0",
    padding: "12px 20px",
    background: "rgba(0,0,0,0.2)",
    borderRadius: "12px",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center"
  },

  activeFiltersLabel: {
    fontSize: "14px",
    fontWeight: 600,
    color: "rgba(255,255,255,0.8)",
    marginRight: "8px"
  },

  activeFilter: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    background: "rgba(255,255,255,0.15)",
    borderRadius: "20px",
    fontSize: "13px",
    "& button": {
      background: "none",
      border: "none",
      color: "rgba(255,255,255,0.7)",
      cursor: "pointer",
      fontSize: "16px",
      padding: "0",
      width: "18px",
      height: "18px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      "&:hover": {
        color: "white"
      }
    }
  },

  // Main Content
  container: {
    maxWidth: "1200px",
    margin: "-40px auto 0",
    padding: "0 20px 40px",
    position: "relative",
    zIndex: 1
  },

  // Renew Button - Floating on right side
  renewButton: {
    position: "fixed",
    top: "120px",
    right: "20px",
    zIndex: 100,
    padding: "12px 20px",
    background: "linear-gradient(135deg, #FFC107 0%, #FF9800 100%)",
    color: "#333",
    border: "none",
    borderRadius: "30px",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(255, 152, 0, 0.3)",
    animation: "pulse 2s infinite",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 8px 25px rgba(255, 152, 0, 0.4)",
      background: "linear-gradient(135deg, #FFD54F 0%, #FFA726 100%)"
    },
    "@media (max-width: 768px)": {
      position: "static",
      margin: "20px auto",
      display: "block",
      width: "fit-content"
    }
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    animation: "fadeIn 0.6s ease-out"
  },

  sectionTitle: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#1a1a1a",
    margin: 0
  },

  resultCount: {
    fontSize: "16px",
    fontWeight: 400,
    color: "#666",
    marginLeft: "10px"
  },

  refreshButton: {
    padding: "8px 16px",
    background: "#0066ff",
    border: "none",
    borderRadius: "8px",
    color: "white",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    "&:hover": {
      background: "#0052cc"
    }
  },

  // Loading, Error, Empty States
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 20px",
    textAlign: "center"
  },

  spinner: {
    width: "50px",
    height: "50px",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #0066ff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px"
  },

  loadingText: {
    fontSize: "16px",
    color: "#666"
  },

  errorContainer: {
    padding: "60px 20px",
    textAlign: "center",
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.1)"
  },

  errorText: {
    color: "#d32f2f",
    fontSize: "16px",
    marginBottom: "20px"
  },

  retryButton: {
    padding: "12px 24px",
    background: "#0066ff",
    border: "none",
    borderRadius: "8px",
    color: "white",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    "&:hover": {
      background: "#0052cc"
    }
  },

  emptyState: {
    padding: "80px 20px",
    textAlign: "center",
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.1)"
  },

  emptyIcon: {
    fontSize: "60px",
    marginBottom: "20px",
    opacity: 0.5
  },

  emptyTitle: {
    fontSize: "24px",
    fontWeight: 600,
    color: "#333",
    marginBottom: "12px"
  },

  emptyText: {
    fontSize: "16px",
    color: "#666",
    marginBottom: "20px",
    maxWidth: "400px",
    margin: "0 auto"
  },

  emptyButton: {
    padding: "12px 24px",
    background: "transparent",
    border: "2px solid #0066ff",
    borderRadius: "8px",
    color: "#0066ff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    "&:hover": {
      background: "#0066ff",
      color: "white"
    }
  },

  // Grid and Cards
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "25px",
    marginBottom: "40px",
    animation: "fadeIn 0.6s ease-out"
  },

  card: {
    background: "white",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
    cursor: "pointer",
    position: "relative"
  },

  imageContainer: {
    position: "relative",
    height: "200px",
    overflow: "hidden"
  },

  cardImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.5s ease"
  },

  badges: {
    position: "absolute",
    top: "12px",
    left: "12px",
    display: "flex",
    gap: "6px"
  },

  verifiedBadge: {
    background: "#4caf50",
    color: "white",
    fontSize: "11px",
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: "12px",
    backdropFilter: "blur(10px)"
  },

  premiumBadge: {
    background: "linear-gradient(90deg, #ff9800, #ff5722)",
    color: "white",
    fontSize: "11px",
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: "12px",
    backdropFilter: "blur(10px)"
  },

  cardContent: {
    padding: "20px"
  },

  cardTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: "12px",
    lineHeight: 1.3
  },

  providerInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px"
  },

  providerAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: 600
  },

  providerName: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#333"
  },

  providerCategory: {
    fontSize: "12px",
    color: "#666"
  },

  location: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "12px"
  },

  locationIcon: {
    fontSize: "14px",
    color: "#666"
  },

  locationText: {
    fontSize: "13px",
    color: "#666"
  },

  description: {
    fontSize: "13px",
    color: "#555",
    lineHeight: 1.5,
    marginBottom: "15px"
  },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px"
  },

  priceSection: {
    display: "flex",
    flexDirection: "column"
  },

  priceLabel: {
    fontSize: "11px",
    color: "#999",
    marginBottom: "4px"
  },

  price: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#1a1a1a"
  },

  rating: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },

  stars: {
    color: "#ffd700",
    fontSize: "14px"
  },

  ratingText: {
    fontSize: "12px",
    color: "#666"
  },

  detailBtn: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(135deg, #0066ff 0%, #0052cc 100%)",
    border: "none",
    borderRadius: "8px",
    color: "white",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.3s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 8px 20px rgba(0, 102, 255, 0.3)"
    }
  },

  // Stats
  stats: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "16px",
    padding: "30px",
    color: "white",
    marginTop: "40px",
    marginBottom: "40px"
  },

  statsTitle: {
    fontSize: "22px",
    fontWeight: 700,
    marginBottom: "25px",
    textAlign: "center"
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "20px"
  },

  stat: {
    textAlign: "center",
    padding: "20px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "12px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.2)"
  },

  statNumber: {
    fontSize: "32px",
    fontWeight: 700,
    marginBottom: "8px"
  },

  statLabel: {
    fontSize: "14px",
    opacity: 0.9
  },

  // Features Section
  featuresSection: {
    marginTop: "40px",
    padding: "50px 0",
    textAlign: "center",
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.05)",
    marginBottom: "40px"
  },

  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "30px",
    marginTop: "40px",
    padding: "0 20px"
  },

  featureCard: {
    padding: "25px",
    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    borderRadius: "12px",
    transition: "all 0.3s ease",
    textAlign: "center",
    "&:hover": {
      transform: "translateY(-5px)",
      boxShadow: "0 15px 30px rgba(0, 102, 255, 0.1)"
    }
  },

  featureIcon: {
    fontSize: "40px",
    marginBottom: "15px"
  },

  featureTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: "10px"
  },

  featureDescription: {
    fontSize: "14px",
    color: "#666",
    lineHeight: 1.5
  },

  // CTA Section
  ctaSection: {
    background: "linear-gradient(135deg, #0066ff 0%, #0052cc 100%)",
    borderRadius: "16px",
    padding: "50px",
    color: "white",
    textAlign: "center",
    marginTop: "40px"
  },

  ctaTitle: {
    fontSize: "32px",
    fontWeight: 700,
    marginBottom: "15px"
  },

  ctaText: {
    fontSize: "16px",
    opacity: 0.9,
    marginBottom: "30px",
    maxWidth: "600px",
    margin: "0 auto"
  },

  ctaButtons: {
    display: "flex",
    gap: "20px",
    justifyContent: "center",
    flexWrap: "wrap"
  },

  ctaButtonPrimary: {
    padding: "15px 30px",
    background: "white",
    color: "#0066ff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 10px 25px rgba(255,255,255,0.2)"
    }
  },

  ctaButtonSecondary: {
    padding: "15px 30px",
    background: "transparent",
    color: "white",
    border: "2px solid white",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.3s ease",
    "&:hover": {
      background: "white",
      color: "#0066ff"
    }
  }
};