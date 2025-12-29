import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import { fixMediaUrl } from "../utils/fixMediaUrl";

/* ======================================================
    LIGHTBOX FOR HD PHOTO VIEW
====================================================== */
function Lightbox({ src, onClose }) {
  if (!src) return null;

  return (
    <div style={lightbox.overlay}>
      <img 
        src={src} 
        style={lightbox.photo} 
        alt="zoom"
        onError={(e) => {
          e.target.src = "https://via.placeholder.com/800x600/cccccc/ffffff?text=Image+Not+Available";
        }}
      />
      <span style={lightbox.close} onClick={onClose}>
        ✕
      </span>
    </div>
  );
}

export default function ServiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ 
    name: "", 
    phone: "", 
    message: "" 
  });

  /* NEW FEATURES */
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [dark, setDark] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [formSubmitted, setFormSubmitted] = useState(false);

  /* ======================================================
      SCROLL PROGRESS INDICATOR
  ====================================================== */
  useEffect(() => {
    function handleScroll() {
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress((window.scrollY / max) * 100);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ======================================================
      LOAD MAIN SERVICE
  ====================================================== */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/service-provider/service/${id}`);
        setService(res.data);
      } catch (err) {
        console.error("❌ Service Load Error:", err);
        setError("Failed to load service details. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  /* ======================================================
      LOAD SIMILAR SERVICES
  ====================================================== */
  useEffect(() => {
    async function loadSimilar() {
      if (!service) return;
      try {
        const res = await api.get("/service-provider/");
        const list = res.data.filter(
          (s) =>
            s._id !== service._id &&
            s.provider?._id === service.provider?._id
        );
        setSimilar(list.slice(0, 4)); // Limit to 4 similar services
      } catch (err) {
        console.error("Similar services load error:", err);
      }
    }
    loadSimilar();
  }, [service]);

  /* FORM CHANGE */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  /* SUBMIT FORM */
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setFormSubmitted(true);
      
      // Get current user email from localStorage if available
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      await api.post("/service-provider/service/enquiry", {
        serviceId: id,
        name: form.name,
        phone: form.phone,
        email: user.email || "customer@site.com",
        message: form.message,
      });

      // Show success message
      setFormSubmitted(true);
      
      // Reset form after delay
      setTimeout(() => {
        setForm({ name: "", phone: "", message: "" });
        setFormSubmitted(false);
      }, 3000);

    } catch (err) {
      console.error("Enquiry submit error:", err);
      alert("❌ Failed to Send Enquiry");
    }
  }

  // Format price with Indian numbering
  const formatPrice = (price) => {
    if (!price) return "Price on request";
    const num = parseFloat(price);
    if (isNaN(num)) return "Price on request";
    
    if (num >= 10000000) {
      return `₹ ${(num / 10000000).toFixed(2)} Cr`;
    } else if (num >= 100000) {
      return `₹ ${(num / 100000).toFixed(2)} Lakh`;
    } else {
      return `₹ ${num.toLocaleString('en-IN')}`;
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading service details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>❌</div>
        <h3>{error}</h3>
        <button 
          style={styles.retryButton}
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
        <button 
          style={styles.backButton}
          onClick={() => navigate("/service-home")}
        >
          ← Back to Services
        </button>
      </div>
    );
  }

  if (!service) return null;

  const mainImage = service?.images?.length > 0
    ? fixMediaUrl(service.images[0])
    : "https://via.placeholder.com/1200x350/cccccc/ffffff?text=No+Image+Available";

  return (
    <>
      {/* ADD CSS STYLES HERE - THIS FIXES THE CRITICAL ERROR */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .fadeIn {
          animation: fadeIn 0.5s ease-in;
        }
      `}</style>
      
      <div
        style={{
          ...styles.page,
          background: dark ? "#0d1117" : "#f7f9fc",
          color: dark ? "#fff" : "#000",
          transition: "background 0.3s, color 0.3s"
        }}
      >
        {/* Progress Bar */}
        <div style={{ ...styles.progressBar, width: scrollProgress + "%" }} />

        {/* Dark Mode Toggle */}
        <button 
          style={styles.darkToggle} 
          onClick={() => setDark(!dark)}
          title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle dark mode"
        >
          {dark ? "🌞" : "🌙"}
        </button>

        {/* Lightbox */}
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

        {/* Breadcrumb */}
        <div style={styles.breadcrumb}>
          <span
            onClick={() => navigate("/service-home")}
            style={styles.link}
          >
            Home
          </span>{" "}
          / <span>{service.title}</span>
        </div>

        {/* Banner */}
        <div style={styles.banner}>
          <img 
            src={mainImage} 
            style={styles.bannerImg} 
            alt={service.title}
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/1200x350/cccccc/ffffff?text=Image+Not+Available";
            }}
          />
        </div>

        {/* Content */}
        <div style={styles.container}>
          {/* LEFT CONTENT */}
          <div style={styles.leftContent}>
            <h1 style={styles.title}>{service.title}</h1>
            
            <div style={styles.priceLocationRow}>
              <p style={styles.price}>{formatPrice(service.price)}</p>
              <p style={styles.location}>
                📍 {service.city || "Location not specified"}
              </p>
            </div>

            <div style={styles.divider}></div>

            <h3 style={styles.sectionTitle}>Description</h3>
            <p style={styles.description}>{service.description}</p>

            {/* Gallery */}
            {service.images?.length > 1 && (
              <>
                <h3 style={styles.sectionTitle}>Gallery</h3>
                <div style={styles.gallery}>
                  {service.images.map((img, index) => (
                    <div key={index} style={styles.galleryItem}>
                      <img
                        src={fixMediaUrl(img)}
                        style={styles.galleryImg}
                        alt={`${service.title} - Image ${index + 1}`}
                        onClick={() => setLightboxSrc(fixMediaUrl(img))}
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/150/cccccc/ffffff?text=Image";
                        }}
                      />
                      <div style={styles.imageOverlay}>
                        <span style={styles.viewIcon}>🔍</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Map - UNCHANGED FUNCTION */}
            <h3 style={styles.sectionTitle}>Location Map</h3>
            <div style={styles.mapWrap}>
              <iframe
                width="100%"
                height="260"
                loading="lazy"
                style={{ border: 0, borderRadius: 10 }}
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  service.city || "India"
                )}&output=embed`}
                title={`Location map for ${service.city || 'India'}`}
              ></iframe>
            </div>

            {/* Provider */}
            <h3 style={styles.sectionTitle}>About Provider</h3>
            <div style={styles.providerCard}>
              <div style={styles.providerHeader}>
                <div style={styles.avatar}>
                  {service.provider?.name?.charAt(0) || "P"}
                </div>
                <div>
                  <h4 style={styles.providerName}>{service.provider?.name || "Service Provider"}</h4>
                  <p style={styles.providerContact}>📧 {service.provider?.email || "Email not provided"}</p>
                </div>
              </div>
              
              <div style={styles.contactButtons}>
                <button
                  style={styles.call}
                  onClick={() =>
                    window.open(`tel:${service.provider?.phone || ''}`)
                  }
                  disabled={!service.provider?.phone}
                >
                  📞 Call Now
                </button>

                <button
                  style={styles.whatsapp}
                  onClick={() =>
                    window.open(
                      `https://wa.me/${service.provider?.phone || ''}?text=I am interested in your service: ${service.title}`
                    )
                  }
                  disabled={!service.provider?.phone}
                >
                  💬 WhatsApp
                </button>
              </div>
            </div>

            {/* Similar Services */}
            {similar.length > 0 && (
              <>
                <h3 style={styles.sectionTitle}>
                  More services by {service.provider?.name || "this provider"}
                </h3>

                <div style={styles.similarGrid}>
                  {similar.map((item) => (
                    <div
                      key={item._id}
                      style={styles.similarCard}
                      onClick={() => navigate(`/service/${item._id}`)}
                    >
                      <img
                        src={item.images?.[0] ? fixMediaUrl(item.images[0]) : "https://via.placeholder.com/160x110/cccccc/ffffff?text=No+Image"}
                        style={styles.similarImg}
                        alt={item.title}
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/160x110/cccccc/ffffff?text=No+Image";
                        }}
                      />
                      <div style={styles.similarContent}>
                        <p style={styles.similarTitle}>{item.title}</p>
                        <p style={styles.similarPrice}>{formatPrice(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* RIGHT ENQUIRY BOX */}
          <div style={styles.enquiryBox}>
            <h3 style={styles.enquiryTitle}>
              <span style={styles.enquiryIcon}>📩</span>
              Contact Provider
            </h3>
            
            {formSubmitted ? (
              <div style={styles.successMessage}>
                <div style={styles.successIcon}>✅</div>
                <h4>Enquiry Sent Successfully!</h4>
                <p>The provider will contact you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={styles.enquiryForm}>
                <div style={styles.formGroup}>
                  <input
                    name="name"
                    placeholder="Your Name *"
                    value={form.name}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <input
                    name="phone"
                    placeholder="Phone Number *"
                    value={form.phone}
                    onChange={handleChange}
                    style={styles.input}
                    required
                    type="tel"
                    pattern="[0-9]{10}"
                    title="Please enter a valid 10-digit phone number"
                  />
                </div>

                <div style={styles.formGroup}>
                  <textarea
                    name="message"
                    placeholder="Your message or enquiry... *"
                    value={form.message}
                    onChange={handleChange}
                    style={styles.textarea}
                    rows="4"
                    required
                  />
                </div>

                <button type="submit" style={styles.submitBtn}>
                  ✨ Send Enquiry ✨
                </button>
                
                <p style={styles.privacyNote}>
                  Your information is secure. We'll never share your details.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Floating Contact Bar */}
        {service.provider?.phone && (
          <div style={styles.floatingBar}>
            <button
              style={styles.floatCall}
              onClick={() => window.open(`tel:${service.provider.phone}`)}
              title="Call provider"
            >
              📞 Call Now
            </button>

            <button
              style={styles.floatWhatsApp}
              onClick={() =>
                window.open(
                  `https://wa.me/${service.provider.phone}?text=Hi, I am interested in "${service.title}"`
                )
              }
              title="Message on WhatsApp"
            >
              💬 WhatsApp
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ======================================================
      ALL STYLES
====================================================== */
const styles = {
  page: { 
    paddingBottom: 60, 
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    minHeight: '100vh'
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '16px'
  },

  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e4e8f0',
    borderTop: '4px solid #0a66c2',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '16px',
    padding: '20px',
    textAlign: 'center'
  },

  errorIcon: {
    fontSize: '48px'
  },

  retryButton: {
    padding: '10px 24px',
    background: '#0a66c2',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  backButton: {
    padding: '10px 24px',
    background: 'transparent',
    color: '#666',
    border: '1px solid #d0d7de',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  progressBar: {
    height: 4,
    background: 'linear-gradient(90deg, #007bff, #00d4ff)',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 99999,
    transition: 'width 0.1s ease'
  },

  darkToggle: {
    position: 'fixed',
    top: 70,
    right: 20,
    fontSize: 22,
    cursor: 'pointer',
    background: '#ffffff',
    padding: '10px',
    borderRadius: '50%',
    zIndex: 9999,
    border: '1px solid #e1e5eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px'
  },

  breadcrumb: {
    padding: '16px 20px',
    fontSize: 15,
    color: '#666',
    background: 'white',
    marginBottom: '1px',
    borderBottom: '1px solid #eee'
  },

  link: { 
    cursor: 'pointer', 
    color: '#0a66c2',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'color 0.2s'
  },

  banner: { 
    width: '100%', 
    height: '350px', 
    overflow: 'hidden',
    position: 'relative'
  },

  bannerImg: { 
    width: '100%', 
    height: '100%', 
    objectFit: 'cover'
  },

  container: {
    maxWidth: '1200px',
    margin: '20px auto 0',
    padding: '0 20px',
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap'
  },

  leftContent: {
    flex: '1',
    minWidth: '300px',
    background: '#fff',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
  },

  title: { 
    fontSize: '32px', 
    fontWeight: '700',
    marginBottom: '8px',
    lineHeight: '1.2'
  },

  priceLocationRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },

  price: { 
    fontSize: '28px', 
    color: '#27ae60', 
    fontWeight: '700' 
  },

  location: { 
    fontSize: '16px', 
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },

  divider: {
    height: '1px',
    background: '#eee',
    margin: '20px 0'
  },

  sectionTitle: { 
    marginTop: '32px', 
    marginBottom: '16px',
    fontSize: '22px', 
    fontWeight: '600',
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  description: { 
    lineHeight: '1.7', 
    fontSize: '16px', 
    color: '#444' 
  },

  gallery: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
    marginTop: '15px'
  },

  galleryItem: {
    position: 'relative',
    borderRadius: '10px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },

  galleryImg: {
    width: '100%',
    height: '110px',
    objectFit: 'cover',
    borderRadius: '10px'
  },

  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s'
  },

  viewIcon: {
    fontSize: '24px',
    color: 'white'
  },

  mapWrap: {
    width: '100%',
    marginTop: '15px',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  },

  providerCard: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '12px',
    marginTop: '15px',
    border: '1px solid #eaeaea'
  },

  providerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px'
  },

  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '20px'
  },

  providerName: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 4px 0'
  },

  providerContact: {
    fontSize: '14px',
    color: '#666',
    margin: '0'
  },

  contactButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px'
  },

  call: {
    padding: '12px',
    background: '#0066ff',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    transition: 'background 0.2s'
  },

  whatsapp: {
    padding: '12px',
    background: '#25D366',
    borderRadius: '8px',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    transition: 'background 0.2s'
  },

  similarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },

  similarCard: {
    background: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #eee',
    height: '100%'
  },

  similarImg: {
    width: '100%',
    height: '140px',
    objectFit: 'cover'
  },

  similarContent: {
    padding: '12px'
  },

  similarTitle: {
    fontWeight: '500',
    fontSize: '14px',
    margin: '0 0 8px 0',
    lineHeight: '1.4'
  },

  similarPrice: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#27ae60',
    margin: '0'
  },

  enquiryBox: {
    flex: '0 0 350px',
    background: '#fff',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    height: 'fit-content',
    position: 'sticky',
    top: '20px'
  },

  enquiryTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  enquiryIcon: {
    fontSize: '24px'
  },

  successMessage: {
    textAlign: 'center',
    padding: '30px 20px'
  },

  successIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },

  enquiryForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #d0d7de',
    fontSize: '15px',
    transition: 'border 0.2s',
    outline: 'none'
  },

  textarea: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #d0d7de',
    fontSize: '15px',
    resize: 'vertical',
    minHeight: '100px',
    fontFamily: 'inherit',
    outline: 'none'
  },

  submitBtn: {
    padding: '14px',
    background: 'linear-gradient(90deg, #ff512f, #dd2476)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'transform 0.2s',
    marginTop: '8px'
  },

  privacyNote: {
    fontSize: '12px',
    color: '#666',
    textAlign: 'center',
    marginTop: '12px',
    lineHeight: '1.4'
  },

  floatingBar: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '12px',
    background: '#ffffff',
    padding: '12px 24px',
    borderRadius: '40px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    zIndex: '9999',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)'
  },

  floatCall: {
    background: '#0066ff',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '30px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    minWidth: '120px'
  },

  floatWhatsApp: {
    background: '#25D366',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '30px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    minWidth: '120px'
  }
};

/* LIGHTBOX */
const lightbox = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    padding: '20px'
  },
  photo: {
    maxWidth: '90%',
    maxHeight: '90%',
    borderRadius: '8px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  },
  close: {
    position: 'fixed',
    top: '20px',
    right: '30px',
    fontSize: '32px',
    color: '#fff',
    cursor: 'pointer',
    background: 'rgba(0,0,0,0.5)',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s'
  }
};