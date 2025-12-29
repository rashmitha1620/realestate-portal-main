import React, { useEffect, useState } from "react";

export default function Legal() {
  const [active, setActive] = useState("");

  useEffect(() => {
    const sections = document.querySelectorAll("section");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      { threshold: 0.4 }
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* ================= SEO META TAGS ================= */}
      <title>Legal | RealEstate 24X7</title>
      <meta
        name="description"
        content="Terms & Conditions, Privacy Policy, Refund Policy, About Us and Contact details of RealEstate 24X7."
      />
      <meta
        name="keywords"
        content="RealEstate 24X7, terms, privacy policy, refund policy, contact, about"
      />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href="https://realestate-portal-1.onrender.com/legal" />

      {/* ================= STYLES ================= */}
      <style>{`
        :root {
          --primary-color: #2563eb; /* 🔹 CHANGE THEME COLOR HERE */
          --text-color: #374151;
          --border-color: #e5e7eb;
          --bg-color: #ffffff;
        }

        .legal-container {
          max-width: 1000px;
          margin: 40px auto;
          padding: 30px 20px;
          background: var(--bg-color);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          line-height: 1.7;
          font-family: Arial, sans-serif;
        }

        .legal-title {
          text-align: center;
          margin-bottom: 30px;
          color: var(--primary-color);
        }

        .legal-nav {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 30px;
        }

        .legal-nav a {
          text-decoration: none;
          color: var(--text-color);
          font-weight: 500;
          padding-bottom: 4px;
          border-bottom: 2px solid transparent;
        }

        .legal-nav a.active {
          color: var(--primary-color);
          border-bottom: 2px solid var(--primary-color);
        }

        .legal-section {
          margin-top: 40px;
          scroll-margin-top: 100px;
        }

        .legal-section h2 {
          border-bottom: 2px solid var(--border-color);
          padding-bottom: 8px;
          margin-bottom: 15px;
          color: var(--primary-color);
        }

        .legal-section p {
          color: var(--text-color);
          font-size: 15px;
          margin-bottom: 10px;
        }

        @media (max-width: 600px) {
          .legal-container {
            padding: 20px 15px;
          }
        }
      `}</style>

      {/* ================= CONTENT ================= */}
      <div className="legal-container">
        <h1 className="legal-title">Legal & Company Information</h1>

        {/* 🔹 Footer Anchor Navigation */}
        <nav className="legal-nav">
          <a href="#terms" className={active === "terms" ? "active" : ""}>Terms</a>
          <a href="#privacy" className={active === "privacy" ? "active" : ""}>Privacy</a>
          <a href="#refund" className={active === "refund" ? "active" : ""}>Refund</a>
          <a href="#about" className={active === "about" ? "active" : ""}>About</a>
          <a href="#contact" className={active === "contact" ? "active" : ""}>Contact</a>
        </nav>

        <section id="terms" className="legal-section">
          <h2>Terms & Conditions</h2>
          <p>
            By accessing or using RealEstate 24X7, you agree to comply with and
            be bound by these Terms and Conditions. The platform acts as an
            intermediary between users, agents, and service providers.
          </p>
          <p>
            Users are responsible for the accuracy of submitted information.
          </p>
        </section>

        <section id="privacy" className="legal-section">
          <h2>Privacy Policy</h2>
          <p>
            We collect personal information such as name, email, and phone
            number only to provide services.
          </p>
          <p>
            Data is never sold and shared only for service fulfillment.
          </p>
        </section>

        <section id="refund" className="legal-section">
          <h2>Refund Policy</h2>
          <p>
            All payments are non-refundable unless otherwise specified.
          </p>
          <p>
            Refund requests must be raised within 7 days.
          </p>
        </section>

        <section id="about" className="legal-section">
          <h2>About Us</h2>
          <p>
            RealEstate 24X7 connects buyers, sellers, agents, and service
            providers on one platform.
          </p>
          <p>
            Developed and managed by <b>MIIT – Mounten Innovative Information
            Technologies Private Limited</b>.
          </p>
        </section>

        <section id="contact" className="legal-section">
          <h2>Contact Us</h2>
          <p><b>Company:</b> Mounten Innovative Information Technologies Pvt Ltd</p>
          <p><b>Contact Person:</b> Shaik Meer Vali (Chairman & MD)</p>
          <p><b>Phone:</b> +91 83416 02908</p>
          <p><b>Email:</b> miithyderabad@gmail.com</p>
          <p>
            <b>Address:</b> Flat No. 401, Sri Rama Towers, 4th Floor,
            Miyapur Main Road, Opp SBI Bank, Hyderabad – 500049
          </p>
        </section>
      </div>
    </>
  );
}
