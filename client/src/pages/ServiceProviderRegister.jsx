import React, { useState, useEffect, useRef } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function ServiceProviderRegister() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    serviceCategory: "",
    selectedServices: [],
    customService: "",
    referralMarketingExecutiveName: "",
    referralMarketingExecutiveId: "",
  });

  const [aadhar, setAadhar] = useState(null);
  const [voter, setVoter] = useState(null);
  const [pan, setPan] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [shake, setShake] = useState(false);
  const [particles, setParticles] = useState([]);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // SERVICE DATA
  const SERVICE_DATA = {
    "Home Services": [
      "Electrical Work",
      "Plumbing Works",
      "Painting Services",
      "Carpentry",
      "Modular Kitchen Setup",
      "Deep Cleaning Services",
      "Pest Control",
    ],
    "Technology & Smart Home Services": [
      "Smart Home Automation",
      "CCTV Installation",
      "Networking & WiFi Setup",
      "Solar Panel Installation",
    ],
    "Construction & Development": [
      "Residential Construction",
      "Renovation",
      "Interior & Exterior Design",
      "Landscaping",
    ],
    "Property Management": [
      "Property Maintenance",
      "Security System Setup",
      "Move-in / Move-out Services",
    ],
  };

  // Floating particles effect
  useEffect(() => {
    const createParticles = () => {
      const particleArray = [];
      for (let i = 0; i < 15; i++) {
        particleArray.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 4 + 1,
          speed: Math.random() * 0.3 + 0.1,
          color: i % 3 === 0 ? "#4f46e5" : i % 3 === 1 ? "#06b6d4" : "#8b5cf6",
          opacity: Math.random() * 0.4 + 0.1,
        });
      }
      setParticles(particleArray);
    };
    createParticles();

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: (p.y + p.speed) % 100,
        x: (p.x + Math.sin(p.y * 0.05) * 0.2) % 100,
      })));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Progress calculation
  useEffect(() => {
    let filled = 0;
    if (form.name) filled += 15;
    if (form.email) filled += 15;
    if (form.phone) filled += 15;
    if (form.password) filled += 15;
    if (form.serviceCategory) filled += 20;
    if (form.selectedServices.length > 0 || form.customService) filled += 20;
    setProgress(filled);
  }, [form]);

  // Section navigation
  const sections = ["Personal", "Services", "Documents"];
  const nextSection = () => setActiveSection(prev => Math.min(prev + 1, 2));
  const prevSection = () => setActiveSection(prev => Math.max(prev - 1, 0));

  // HANDLE INPUT
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // HANDLE SUB-SERVICE TOGGLE
  const toggleService = (service) => {
    let updated = [...form.selectedServices];

    if (updated.includes(service)) {
      updated = updated.filter((s) => s !== service);
    } else {
      updated.push(service);
    }

    setForm({ ...form, selectedServices: updated });
  };

  // File upload handler
  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setMsg("❌ File size too large (max 5MB)");
      return;
    }

    // Check file type
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setMsg("❌ Please upload JPG, PNG or PDF files only");
      return;
    }

    switch (type) {
      case "aadhar":
        setAadhar(file);
        break;
      case "voter":
        setVoter(file);
        break;
      case "pan":
        setPan(file);
        break;
    }

    // Animate file upload success
    const input = e.target;
    input.style.background = "linear-gradient(90deg, #10b981, #34d399)";
    setTimeout(() => {
      input.style.background = "";
    }, 500);
  };

  // SUBMIT
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!aadhar || !voter) {
    setMsg("❌ Please upload Aadhar & Voter ID");
    return;
  }

  let finalServices = [...form.selectedServices];
  if (form.customService.trim()) {
    finalServices.push(form.customService.trim());
  }

  if (finalServices.length === 0) {
    setMsg("❌ Please select at least one service");
    return;
  }

  setLoading(true);
  setMsg("Redirecting to payment...");

  try {
    /* ===============================
       1️⃣ CREATE ORDER (CASHFREE)
    =============================== */
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("email", form.email);
    fd.append("phone", form.phone);
    fd.append("password", form.password);
    fd.append("serviceCategory", form.serviceCategory);
    fd.append("selectedServices", JSON.stringify(finalServices));
    fd.append("referralMarketingExecutiveName", form.referralMarketingExecutiveName);
    fd.append("referralMarketingExecutiveId", form.referralMarketingExecutiveId);
    fd.append("aadhar", aadhar);
    fd.append("voter", voter);
    if (pan) fd.append("pan", pan);

    const { data } = await api.post(
      "/payments/service-provider/create-order",
      fd,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    const paymentSessionId =
      data.paymentSessionId || data.payment_session_id;

    const { tempId, order } = data;

    if (!paymentSessionId) {
      throw new Error("Missing payment session id");
    }

    /* ===============================
       2️⃣ LOAD CASHFREE SDK
    =============================== */
    if (!window.Cashfree) {
      await new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
        script.onload = resolve;
        document.body.appendChild(script);
      });
    }

    /* ===============================
       3️⃣ SAVE TEMP DATA
    =============================== */
    sessionStorage.setItem("providerTempId", tempId);
    sessionStorage.setItem("providerOrderId", order.order_id);

    /* ===============================
       4️⃣ OPEN CASHFREE CHECKOUT
    =============================== */
    const cashfreeMode =
      import.meta.env.VITE_CASHFREE_MODE === "production"
        ? "production"
        : "sandbox";

    console.log("💳 Cashfree mode:", cashfreeMode);

    const cashfree = new window.Cashfree({
      mode: cashfreeMode,
    });

    cashfree.checkout({
      paymentSessionId,
      redirectTarget: "_self",
    });

  } catch (err) {
    console.error(err);
    setMsg("❌ Registration failed. Please try again.");
    setLoading(false);
  }
};


  // Common input style
  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    background: "#f9fafb",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "15px",
    color: "#1f2937",
    outline: "none",
    transition: "all 0.3s ease",
  };

  return (
    <div style={styles.container} ref={containerRef}>
      {/* Animated Background */}
      <div style={styles.background}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              ...styles.particle,
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              background: p.color,
              opacity: p.opacity,
            }}
          />
        ))}
        <div style={styles.gradientOrb1}></div>
        <div style={styles.gradientOrb2}></div>
      </div>

      {/* Main Card */}
      <div style={{
        ...styles.card,
        ...(shake && styles.shakeEffect)
      }}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <div style={styles.icon}>🔧</div>
            <div style={styles.iconGlow}></div>
          </div>
          <h1 style={styles.title}>Join Our Service Network</h1>
          <p style={styles.subtitle}>Expand your business with premium clients</p>
          
          {/* Progress Bar */}
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${progress}%`,
                  background: progress >= 100 
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'linear-gradient(90deg, #4f46e5, #8b5cf6)'
                }}
              ></div>
            </div>
            <span style={styles.progressText}>{progress}% Complete</span>
          </div>

          {/* Section Navigation */}
          <div style={styles.sectionNav}>
            {sections.map((section, index) => (
              <div key={section} style={styles.sectionItem}>
                <div 
                  style={{
                    ...styles.sectionDot,
                    ...(index === activeSection && styles.sectionDotActive),
                    ...(index < activeSection && styles.sectionDotCompleted)
                  }}
                  onClick={() => setActiveSection(index)}
                >
                  {index < activeSection ? '✓' : index + 1}
                </div>
                <span style={{
                  ...styles.sectionLabel,
                  ...(index === activeSection && styles.sectionLabelActive)
                }}>
                  {section}
                </span>
                {index < sections.length - 1 && (
                  <div style={styles.sectionLine}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Personal Details Section */}
          {(activeSection === 0 || activeSection === 1 || activeSection === 2) && (
            <div style={{
              ...styles.section,
              display: activeSection === 0 ? 'block' : 'none'
            }}>
              <h3 style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>👤</span>
                Personal Details
              </h3>
              <div style={styles.inputGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Full Name</label>
                  <input
                    name="name"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={form.phone}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Password</label>
                  <input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              <h4 style={styles.subsectionTitle}>
                <span style={styles.subsectionIcon}>👥</span>
                Referral (Optional)
              </h4>
              <div style={styles.inputGrid}>
                <div style={styles.inputGroup}>
                  <input
                    name="referralMarketingExecutiveName"
                    placeholder="Marketing Executive Name"
                    value={form.referralMarketingExecutiveName}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <input
                    name="referralMarketingExecutiveId"
                    placeholder="Marketing Executive ID"
                    value={form.referralMarketingExecutiveId}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Services Section */}
          {(activeSection === 1 || activeSection === 2) && (
            <div style={{
              ...styles.section,
              display: activeSection === 1 ? 'block' : 'none'
            }}>
              <h3 style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>🛠️</span>
                Service Details
              </h3>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Service Category</label>
                <select
                  name="serviceCategory"
                  value={form.serviceCategory}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      serviceCategory: e.target.value,
                      selectedServices: [],
                      customService: "",
                    })
                  }
                  style={{
                    ...inputStyle,
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 16px center",
                    backgroundSize: "20px",
                    paddingRight: "40px",
                  }}
                  required
                >
                  <option value="">Select Category</option>
                  {Object.keys(SERVICE_DATA).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {form.serviceCategory && (
                <>
                  <label style={styles.label}>Select Services</label>
                  <div style={styles.servicesGrid}>
                    {SERVICE_DATA[form.serviceCategory].map((srv) => (
                      <div
                        key={srv}
                        onClick={() => toggleService(srv)}
                        style={{
                          ...styles.serviceChip,
                          ...(form.selectedServices.includes(srv) && styles.serviceChipActive)
                        }}
                      >
                        {form.selectedServices.includes(srv) && (
                          <span style={styles.checkIcon}>✓</span>
                        )}
                        {srv}
                      </div>
                    ))}
                  </div>

                  <div style={styles.customServiceContainer}>
                    <label style={styles.label}>
                      <input
                        type="checkbox"
                        checked={form.customService !== ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            customService: e.target.checked ? "" : "",
                          })
                        }
                        style={styles.checkbox}
                      />
                      Add Custom Service
                    </label>
                    
                    {form.customService !== "" && (
                      <input
                        placeholder="Enter your custom service"
                        value={form.customService}
                        onChange={(e) =>
                          setForm({ ...form, customService: e.target.value })
                        }
                        style={inputStyle}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Documents Section */}
          {activeSection === 2 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>📄</span>
                Document Upload
              </h3>
              
              <div style={styles.uploadGrid}>
                <div style={styles.uploadCard}>
                  <div style={styles.uploadIcon}>🪪</div>
                  <h4 style={styles.uploadTitle}>Aadhar Card *</h4>
                  <p style={styles.uploadDesc}>Required for verification</p>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e, "aadhar")}
                    style={styles.fileInput}
                    accept=".jpg,.jpeg,.png,.pdf"
                    required
                  />
                  {aadhar && (
                    <div style={styles.filePreview}>
                      📎 {aadhar.name}
                    </div>
                  )}
                </div>

                <div style={styles.uploadCard}>
                  <div style={styles.uploadIcon}>🗳️</div>
                  <h4 style={styles.uploadTitle}>Voter ID *</h4>
                  <p style={styles.uploadDesc}>Required for verification</p>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e, "voter")}
                    style={styles.fileInput}
                    accept=".jpg,.jpeg,.png,.pdf"
                    required
                  />
                  {voter && (
                    <div style={styles.filePreview}>
                      📎 {voter.name}
                    </div>
                  )}
                </div>

                <div style={styles.uploadCard}>
                  <div style={styles.uploadIcon}>💳</div>
                  <h4 style={styles.uploadTitle}>PAN Card</h4>
                  <p style={styles.uploadDesc}>Optional for tax purposes</p>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e, "pan")}
                    style={styles.fileInput}
                    accept=".jpg,.jpeg,.png,.pdf"
                  />
                  {pan && (
                    <div style={styles.filePreview}>
                      📎 {pan.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription Info */}
              <div style={styles.pricingCard}>
                <div style={styles.pricingIcon}>💰</div>
                <div>
                  <h4 style={styles.pricingTitle}>Subscription Fee</h4>
                  <p style={styles.pricingAmount}>₹1500 / year</p>
                  <p style={styles.pricingFeatures}>
                    Includes: Premium listing, Client referrals, Dashboard access
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={styles.buttonGroup}>
            {activeSection > 0 && (
              <button
                type="button"
                onClick={prevSection}
                style={styles.secondaryButton}
                disabled={loading}
              >
                ← Back
              </button>
            )}
            
            {activeSection < 2 ? (
              <button
                type="button"
                onClick={nextSection}
                style={styles.primaryButton}
                disabled={!form.name || !form.email || !form.phone || !form.password}
              >
                Continue →
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitButton,
                  ...(loading && styles.loadingButton)
                }}
              >
                {loading ? (
                  <>
                    <div style={styles.spinner}></div>
                    Processing...
                  </>
                ) : (
                  "Pay ₹1500 & Register"
                )}
              </button>
            )}
          </div>

          {/* Message Display */}
          {msg && (
            <div style={{
              ...styles.message,
              ...(msg.includes("✅") || msg.includes("🎉") ? styles.messageSuccess : 
                  msg.includes("❌") ? styles.messageError : styles.messageInfo)
            }}>
              {msg}
              {msg.includes("🎉") && (
                <div style={styles.confetti}>🎉</div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already registered?{' '}
            <span 
              onClick={() => navigate("/service-provider-login")}
              style={styles.footerLink}
            >
              Login here
            </span>
          </p>
        </div>
      </div>

      {/* Confetti CSS */}
      <style>{`
        @keyframes confetti {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(${Math.random() * 200 - 100}px, 500px) rotate(${Math.random() * 360}deg); opacity: 0; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        @keyframes slideIn {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    background: "linear-gradient(135deg, #f0f4ff 0%, #e6f0ff 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  particle: {
    position: "absolute",
    borderRadius: "50%",
    animation: "float 3s infinite ease-in-out",
  },

  gradientOrb1: {
    position: "absolute",
    top: "10%",
    right: "10%",
    width: "300px",
    height: "300px",
    background: "radial-gradient(circle, rgba(79, 70, 229, 0.1) 0%, transparent 70%)",
    borderRadius: "50%",
    animation: "pulse 4s infinite",
  },

  gradientOrb2: {
    position: "absolute",
    bottom: "10%",
    left: "10%",
    width: "250px",
    height: "250px",
    background: "radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)",
    borderRadius: "50%",
    animation: "pulse 5s infinite reverse",
  },

  card: {
    width: "100%",
    maxWidth: "800px",
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    borderRadius: "24px",
    padding: "40px",
    boxShadow: `
      0 20px 60px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(255, 255, 255, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.8)
    `,
    position: "relative",
    zIndex: 1,
    animation: "slideIn 0.6s ease-out",
  },

  shakeEffect: {
    animation: "shake 0.5s ease-in-out",
  },

  header: {
    textAlign: "center",
    marginBottom: "40px",
  },

  iconContainer: {
    position: "relative",
    display: "inline-block",
    marginBottom: "20px",
  },

  icon: {
    fontSize: "60px",
    background: "linear-gradient(135deg, #4f46e5, #8b5cf6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    animation: "float 3s infinite ease-in-out",
  },

  iconGlow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "80px",
    height: "80px",
    background: "radial-gradient(circle, rgba(79, 70, 229, 0.2) 0%, transparent 70%)",
    borderRadius: "50%",
    animation: "pulse 2s infinite",
  },

  title: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "8px",
    background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  subtitle: {
    fontSize: "16px",
    color: "#6b7280",
    marginBottom: "30px",
  },

  progressContainer: {
    marginBottom: "30px",
  },

  progressBar: {
    height: "6px",
    background: "#e5e7eb",
    borderRadius: "3px",
    overflow: "hidden",
    marginBottom: "8px",
  },

  progressFill: {
    height: "100%",
    borderRadius: "3px",
    transition: "width 0.5s ease",
  },

  progressText: {
    fontSize: "14px",
    color: "#6b7280",
    fontWeight: "500",
  },

  sectionNav: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "40px",
    marginTop: "30px",
  },

  sectionItem: {
    display: "flex",
    alignItems: "center",
    position: "relative",
  },

  sectionDot: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#e5e7eb",
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    zIndex: 2,
  },

  sectionDotActive: {
    background: "linear-gradient(135deg, #4f46e5, #8b5cf6)",
    color: "white",
    boxShadow: "0 0 0 4px rgba(79, 70, 229, 0.2)",
  },

  sectionDotCompleted: {
    background: "#10b981",
    color: "white",
  },

  sectionLabel: {
    position: "absolute",
    top: "45px",
    fontSize: "12px",
    color: "#9ca3af",
    fontWeight: "500",
    whiteSpace: "nowrap",
  },

  sectionLabelActive: {
    color: "#4f46e5",
    fontWeight: "600",
  },

  sectionLine: {
    width: "40px",
    height: "2px",
    background: "#e5e7eb",
    position: "absolute",
    left: "calc(100% + 2px)",
  },

  form: {
    marginTop: "20px",
  },

  section: {
    marginBottom: "40px",
  },

  sectionTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  sectionIcon: {
    fontSize: "24px",
  },

  subsectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#4b5563",
    margin: "30px 0 15px 0",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  subsectionIcon: {
    fontSize: "18px",
  },

  inputGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "10px",
  },

  inputGroup: {
    marginBottom: "10px",
  },

  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "8px",
  },

  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "12px",
    margin: "15px 0",
  },

  serviceChip: {
    padding: "12px 16px",
    background: "#f3f4f6",
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "14px",
    color: "#4b5563",
    cursor: "pointer",
    transition: "all 0.3s ease",
    position: "relative",
    userSelect: "none",
  },

  serviceChipActive: {
    background: "linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(139, 92, 246, 0.1))",
    borderColor: "#4f46e5",
    color: "#4f46e5",
    fontWeight: "500",
  },

  checkIcon: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "12px",
    fontWeight: "bold",
  },

  customServiceContainer: {
    marginTop: "20px",
  },

  checkbox: {
    marginRight: "8px",
    transform: "scale(1.2)",
  },

  uploadGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  },

  uploadCard: {
    background: "#f9fafb",
    border: "2px dashed #d1d5db",
    borderRadius: "16px",
    padding: "24px",
    textAlign: "center",
    transition: "all 0.3s ease",
    position: "relative",
    cursor: "pointer",
  },

  uploadIcon: {
    fontSize: "32px",
    marginBottom: "12px",
  },

  uploadTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "4px",
  },

  uploadDesc: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "16px",
  },

  fileInput: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: "pointer",
  },

  filePreview: {
    marginTop: "12px",
    fontSize: "13px",
    color: "#059669",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
  },

  pricingCard: {
    background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
    border: "2px solid #bae6fd",
    borderRadius: "16px",
    padding: "24px",
    marginTop: "30px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },

  pricingIcon: {
    fontSize: "32px",
    color: "#0ea5e9",
  },

  pricingTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#0369a1",
    marginBottom: "4px",
  },

  pricingAmount: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#0c4a6e",
    marginBottom: "8px",
  },

  pricingFeatures: {
    fontSize: "14px",
    color: "#0ea5e9",
  },

  buttonGroup: {
    display: "flex",
    gap: "16px",
    marginTop: "30px",
  },

  primaryButton: {
    flex: 1,
    padding: "16px",
    background: "linear-gradient(135deg, #4f46e5, #8b5cf6)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },

  secondaryButton: {
    flex: 1,
    padding: "16px",
    background: "#f3f4f6",
    color: "#4b5563",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },

  submitButton: {
    flex: 1,
    padding: "18px",
    background: "linear-gradient(135deg, #059669, #10b981)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    position: "relative",
    overflow: "hidden",
  },

  loadingButton: {
    opacity: 0.9,
    cursor: "not-allowed",
  },

  spinner: {
    width: "20px",
    height: "20px",
    border: "3px solid rgba(255, 255, 255, 0.3)",
    borderTop: "3px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  message: {
    marginTop: "20px",
    padding: "16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "500",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
    animation: "slideIn 0.3s ease-out",
  },

  messageSuccess: {
    background: "rgba(16, 185, 129, 0.1)",
    border: "2px solid #10b981",
    color: "#065f46",
  },

  messageError: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "2px solid #ef4444",
    color: "#991b1b",
  },

  messageInfo: {
    background: "rgba(59, 130, 246, 0.1)",
    border: "2px solid #3b82f6",
    color: "#1e40af",
  },

  confetti: {
    position: "absolute",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "20px",
    animation: "float 1s infinite",
  },

  footer: {
    marginTop: "30px",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
    textAlign: "center",
  },

  footerText: {
    fontSize: "14px",
    color: "#6b7280",
  },

  footerLink: {
    color: "#4f46e5",
    fontWeight: "600",
    cursor: "pointer",
    textDecoration: "underline",
    transition: "color 0.3s ease",
  },
};

// Add missing keyframe
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);