import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Footer() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    
    window.addEventListener("scroll", onScroll);
    window.addEventListener("resize", checkMobile);
    
    checkMobile(); // Initial check
    
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email) return;
    
    // Simulate subscription
    setSubscribed(true);
    setTimeout(() => {
      setSubscribed(false);
      setEmail("");
    }, 3000);
  };

  // ================= ADVANCED STYLES =================

  const styles = {
    footer: {
      background: "linear-gradient(180deg, #0a0a1a 0%, #0f172a 100%)",
      color: "#e2e8f0",
      paddingTop: "80px",
      paddingBottom: "40px",
      marginTop: "120px",
      position: "relative",
      overflow: "hidden",
      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
    },

    content: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1fr",
      gap: isMobile ? "40px" : "50px",
      maxWidth: "1400px",
      margin: "0 auto",
      padding: isMobile ? "0 20px" : "0 40px",
    },

    section: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },

    logo: {
      fontSize: isMobile ? "28px" : "32px",
      fontWeight: "900",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      textDecoration: "none",
      display: "inline-block",
      letterSpacing: "-0.5px",
    },

    tagline: {
      color: "#94a3b8",
      margin: "15px 0 25px 0",
      fontSize: isMobile ? "15px" : "16px",
      lineHeight: "1.7",
      maxWidth: "350px",
    },

    socialRow: {
      display: "flex",
      gap: "12px",
      flexWrap: "wrap",
    },

    socialIcon: {
      width: "44px",
      height: "44px",
      borderRadius: "50%",
      background: "rgba(255, 255, 255, 0.05)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#cbd5e1",
      textDecoration: "none",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      ":hover": {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        transform: "translateY(-3px) rotate(5deg)",
        boxShadow: "0 8px 20px rgba(102, 126, 234, 0.3)",
      },
    },

    heading: {
      fontSize: "18px",
      fontWeight: "700",
      color: "#ffffff",
      marginBottom: "20px",
      paddingBottom: "10px",
      position: "relative",
      ":after": {
        content: '""',
        position: "absolute",
        bottom: "0",
        left: "0",
        width: "40px",
        height: "3px",
        background: "linear-gradient(90deg, #667eea, #764ba2)",
        borderRadius: "2px",
      },
    },

    link: {
      color: "#94a3b8",
      textDecoration: "none",
      fontSize: "15px",
      padding: "8px 0",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.3s ease",
      ":hover": {
        color: "#667eea",
        transform: "translateX(8px)",
        paddingLeft: "8px",
      },
    },

    text: {
      color: "#94a3b8",
      fontSize: "14px",
      lineHeight: "1.7",
      marginBottom: "12px",
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
    },

    newsletter: {
      marginTop: "80px",
      padding: isMobile ? "30px 20px" : "50px 40px",
      background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
      borderRadius: "24px",
      textAlign: "center",
      maxWidth: "1000px",
      marginLeft: "auto",
      marginRight: "auto",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      backdropFilter: "blur(10px)",
      position: "relative",
      overflow: "hidden",
      ":before": {
        content: '""',
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        height: "3px",
        background: "linear-gradient(90deg, #667eea, #764ba2, #667eea)",
        backgroundSize: "200% 100%",
        animation: "shimmer 3s infinite linear",
      },
    },

    newsletterTitle: {
      color: "#ffffff",
      fontSize: isMobile ? "24px" : "28px",
      marginBottom: "15px",
      fontWeight: "800",
      background: "linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },

    newsletterText: {
      color: "#94a3b8",
      fontSize: isMobile ? "16px" : "17px",
      marginBottom: "30px",
      maxWidth: "600px",
      marginLeft: "auto",
      marginRight: "auto",
      lineHeight: "1.6",
    },

    newsletterRow: {
      display: "flex",
      gap: "15px",
      justifyContent: "center",
      flexWrap: "wrap",
      maxWidth: "600px",
      margin: "0 auto",
    },

    input: {
      flex: "1",
      minWidth: isMobile ? "100%" : "300px",
      padding: "16px 24px",
      borderRadius: "50px",
      border: "2px solid rgba(255, 255, 255, 0.1)",
      background: "rgba(255, 255, 255, 0.05)",
      color: "#ffffff",
      fontSize: "16px",
      outline: "none",
      transition: "all 0.3s ease",
      ":focus": {
        borderColor: "#667eea",
        background: "rgba(255, 255, 255, 0.08)",
        boxShadow: "0 0 0 4px rgba(102, 126, 234, 0.2)",
      },
      "::placeholder": {
        color: "#94a3b8",
      },
    },

    btn: {
      padding: "16px 40px",
      borderRadius: "50px",
      border: "none",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "#ffffff",
      fontSize: "16px",
      fontWeight: "700",
      cursor: "pointer",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      whiteSpace: "nowrap",
      position: "relative",
      overflow: "hidden",
      ":hover": {
        transform: "translateY(-3px)",
        boxShadow: "0 12px 25px rgba(102, 126, 234, 0.4)",
      },
      ":active": {
        transform: "translateY(0)",
      },
      ":before": {
        content: '""',
        position: "absolute",
        top: "0",
        left: "-100%",
        width: "100%",
        height: "100%",
        background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
        transition: "left 0.5s",
      },
      ":hover:before": {
        left: "100%",
      },
    },

    successMessage: {
      color: "#48bb78",
      fontSize: "16px",
      marginTop: "15px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      animation: "fadeIn 0.5s ease",
    },

    bottom: {
      marginTop: "60px",
      padding: isMobile ? "25px 20px" : "30px 40px",
      background: "rgba(0, 0, 0, 0.2)",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: isMobile ? "20px" : "0",
      fontSize: "14px",
      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
    },

    copyright: {
      color: "#94a3b8",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },

    legalLinks: {
      display: "flex",
      gap: isMobile ? "15px" : "30px",
      flexWrap: "wrap",
      justifyContent: isMobile ? "center" : "flex-end",
    },

    bottomLink: {
      color: "#94a3b8",
      textDecoration: "none",
      fontSize: "14px",
      transition: "color 0.3s ease",
      position: "relative",
      padding: "4px 0",
      ":hover": {
        color: "#667eea",
        ":after": {
          width: "100%",
        },
      },
      ":after": {
        content: '""',
        position: "absolute",
        bottom: "0",
        left: "0",
        width: "0",
        height: "2px",
        background: "#667eea",
        transition: "width 0.3s ease",
      },
    },

    backToTop: {
      position: "fixed",
      bottom: isMobile ? "20px" : "30px",
      right: isMobile ? "20px" : "30px",
      width: isMobile ? "50px" : "56px",
      height: isMobile ? "50px" : "56px",
      borderRadius: "50%",
      border: "none",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      zIndex: "999",
      boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
      opacity: showBackToTop ? 1 : 0,
      visibility: showBackToTop ? "visible" : "hidden",
      transform: showBackToTop ? "translateY(0)" : "translateY(20px)",
      fontSize: "20px",
      ":hover": {
        transform: "translateY(-5px) rotate(360deg)",
        boxShadow: "0 12px 30px rgba(102, 126, 234, 0.6)",
      },
      ":active": {
        transform: "translateY(0) rotate(360deg)",
      },
    },

    // Decorative elements
    floatingElement1: {
      position: "absolute",
      top: "20%",
      left: "5%",
      width: "100px",
      height: "100px",
      background: "radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%)",
      borderRadius: "50%",
      filter: "blur(20px)",
    },

    floatingElement2: {
      position: "absolute",
      bottom: "20%",
      right: "5%",
      width: "150px",
      height: "150px",
      background: "radial-gradient(circle, rgba(118, 75, 162, 0.1) 0%, transparent 70%)",
      borderRadius: "50%",
      filter: "blur(30px)",
    },

    divider: {
      height: "1px",
      background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)",
      margin: "40px 0",
      width: "100%",
    },
  };

  // Link icons for better UX
  const linkIcons = {
    "Home": "🏠",
    "Properties": "🏢",
    "Services": "🔧",
    "Agents": "👨‍💼",
    "Contact": "📞",
    "Apartment": "🏠",
    "Villa": "🏡",
    "Plots": "📐",
    "Commercial": "🏢",
    "Farmhouse": "🌾",
    "Privacy Policy": "🔒",
    "Terms of Service": "📄",
    "Refund Policy": "💰",
    "Contact Us": "📧",
  };

  return (
    <>
      <footer style={styles.footer}>
        {/* Decorative elements */}
        <div style={styles.floatingElement1}></div>
        <div style={styles.floatingElement2}></div>

        <div style={styles.content}>
          {/* Brand Section */}
          <div style={styles.section}>
            <Link to="/" style={styles.logo}>RealEstate 24X7</Link>
            <p style={styles.tagline}>
              Your trusted partner for buying, selling & renting properties across India.
            </p>

            <div style={styles.socialRow}>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" style={styles.socialIcon}>
                <svg viewBox="0 0 24 24" width="22" fill="currentColor">
                  <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.5c0-2.4 1.4-3.7 3.6-3.7 1 0 2 .1 2 .1v2.2H15c-1.2 0-1.5.7-1.5 1.4V12H16l-.4 3h-2.1v7A10 10 0 0 0 22 12Z"/>
                </svg>
              </a>

              <a href="https://twitter.com" target="_blank" rel="noreferrer" style={styles.socialIcon}>
                <svg viewBox="0 0 24 24" width="22" fill="currentColor">
                  <path d="M22 5.8c-.8.4-1.6.6-2.5.8a4.2 4.2 0 0 0 1.8-2.3 8.3 8.3 0 0 1-2.6 1A4.1 4.1 0 0 0 12 8c0 .3 0 .6.1.8A11.6 11.6 0 0 1 3 4.6a4.1 4.1 0 0 0 1.3 5.5A4 4 0 0 1 2.8 9v.1a4.1 4.1 0 0 0 3.3 4 4.2 4.2 0 0 1-1.8.1 4.1 4.1 0 0 0 3.8 2.9A8.3 8.3 0 0 1 2 18.4 11.7 11.7 0 0 0 8.3 20c7.6 0 11.8-6.3 11.8-11.8v-.5A8.4 8.4 0 0 0 22 5.8Z"/>
                </svg>
              </a>

              <a href="https://instagram.com" target="_blank" rel="noreferrer" style={styles.socialIcon}>
                <svg viewBox="0 0 24 24" width="22" fill="currentColor">
                  <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6-.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/>
                </svg>
              </a>

              <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={styles.socialIcon}>
                <svg viewBox="0 0 24 24" width="22" fill="currentColor">
                  <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 8.98h4v12H3Zm7 0h3.8v1.6h.1c.5-.9 1.7-1.8 3.6-1.8 3.9 0 4.6 2.6 4.6 6v6.2h-4v-5.5c0-1.3 0-3-1.8-3s-2 1.4-2 2.9v5.6h-4Z"/>
                </svg>
              </a>

              <a href="https://youtube.com" target="_blank" rel="noreferrer" style={styles.socialIcon}>
                <svg viewBox="0 0 24 24" width="22" fill="currentColor">
                  <path d="M23.5 6.2s-.2-1.7-.9-2.5c-.8-.9-1.7-.9-2.1-1C17.6 2.5 12 2.5 12 2.5h0s-5.6 0-8.5.2c-.4.1-1.3.1-2.1 1C.7 4.5.5 6.2.5 6.2S0 8.2 0 10.1v1.8c0 2 .5 3.9.5 3.9s.2 1.7.9 2.5c.8.9 1.9.9 2.4 1 1.7.2 7.2.3 7.2.3s5.6 0 8.5-.3c.4-.1 1.3-.1 2.1-1 .7-.8.9-2.5.9-2.5s.5-2 .5-3.9v-1.8c0-2-.5-3.9-.5-3.9ZM9.5 13.5v-6l6 3-6 3Z"/>
                </svg>
              </a>
            </div>
          </div>

         {/* Quick Links - Placeholder version */}
<div style={styles.section}>
  <h4 style={styles.heading}>Quick Links</h4>
  <a href="#" style={styles.link} onClick={(e) => { e.preventDefault(); window.scrollTo(0, 0); }}>
    <span>🏠</span> Home
  </a>
  <a href="#" style={styles.link} onClick={(e) => { e.preventDefault(); alert('Properties page coming soon!'); }}>
    <span>🏢</span> Properties
  </a>
  <Link to="/service-home" style={styles.link} onClick={() => window.scrollTo(0, 0)}>
    <span>🔧</span> Services
  </Link>
  <a href="#" style={styles.link} onClick={(e) => { e.preventDefault(); alert('Browse agents from the homepage'); }}>
    <span>👨‍💼</span> Agents
  </a>
  <Link to="/contact" style={styles.link} onClick={() => window.scrollTo(0, 0)}>
    <span>📞</span> Contact
  </Link>
</div>

{/* Property Types - Filter links */}
<div style={styles.section}>
  <h4 style={styles.heading}>Property Types</h4>
  <a href="#" style={styles.link} onClick={(e) => { e.preventDefault(); alert('Filter by Apartment'); }}>
    <span>🏠</span> Apartment
  </a>
  <a href="#" style={styles.link} onClick={(e) => { e.preventDefault(); alert('Filter by Villa'); }}>
    <span>🏡</span> Villa
  </a>
  <a href="#" style={styles.link} onClick={(e) => { e.preventDefault(); alert('Filter by Plots'); }}>
    <span>📐</span> Plots
  </a>
  <a href="#" style={styles.link} onClick={(e) => { e.preventDefault(); alert('Filter by Commercial'); }}>
    <span>🏢</span> Commercial
  </a>
  <a href="#" style={styles.link} onClick={(e) => { e.preventDefault(); alert('Filter by Farmhouse'); }}>
    <span>🌾</span> Farmhouse
  </a>
</div>

          {/* Contact */}
          <div style={styles.section}>
            <h4 style={styles.heading}>Contact</h4>
            <p style={styles.text}>
              <span>📍</span> Flat No. 401, Sri Rama Towers, 4th Floor, Miyapur Main Road, Opp SBI Bank, Hyderabad – 500049
            </p>
            <p style={styles.text}>
              <span>📞</span> +91 83416 02908
            </p>
            <p style={styles.text}>
              <span>📱</span> +91 91000 71666
            </p>
            <p style={styles.text}>
              <span>✉️</span> miithyderabad@gmail.com
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={styles.divider}></div>

        {/* Newsletter */}
        <div style={styles.newsletter}>
          <h3 style={styles.newsletterTitle}>Stay Updated</h3>
          <p style={styles.newsletterText}>
            Subscribe to get latest property updates, exclusive offers and market insights.
          </p>
          <form onSubmit={handleSubscribe} style={styles.newsletterRow}>
            <input 
              type="email" 
              placeholder="Your email address" 
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" style={styles.btn}>
              {subscribed ? "Subscribed! ✓" : "Subscribe Now"}
            </button>
          </form>
          {subscribed && (
            <div style={styles.successMessage}>
              <span>✓</span> Thank you for subscribing! You'll hear from us soon.
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div style={styles.bottom}>
          <span style={styles.copyright}>
            <span>© {new Date().getFullYear()} RealEstate 24X7</span>
            <span style={{ color: "#667eea" }}> • </span>
            <span>All rights reserved</span>
          </span>
          <div style={styles.legalLinks}>
            <Link to="/privacy" style={styles.bottomLink} onClick={() => window.scrollTo(0, 0)}>
              {linkIcons["Privacy Policy"]} Privacy Policy
            </Link>
            <Link to="/terms" style={styles.bottomLink} onClick={() => window.scrollTo(0, 0)}>
              {linkIcons["Terms of Service"]} Terms of Service
            </Link>
            <Link to="/refund" style={styles.bottomLink} onClick={() => window.scrollTo(0, 0)}>
              {linkIcons["Refund Policy"]} Refund Policy
            </Link>
            <Link to="/contact" style={styles.bottomLink} onClick={() => window.scrollTo(0, 0)}>
              {linkIcons["Contact Us"]} Contact Us
            </Link>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        style={styles.backToTop}
        aria-label="Back to top"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4l-8 8h5v8h6v-8h5z"/>
        </svg>
      </button>

      {/* Add CSS animations */}
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
    </>
  );
}