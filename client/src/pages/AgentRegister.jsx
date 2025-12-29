import React, { useState, useEffect } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function AgentRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [voterFileName, setVoterFileName] = useState("");
  const [voterFile, setVoterFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [particles, setParticles] = useState([]);
  const [floatingIcons, setFloatingIcons] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressWidth, setProgressWidth] = useState("33%");

  const PROFESSIONS = [
    "Software Employee",
    "Businessman",
    "Teacher",
    "Real Estate Agent",
    "Contractor",
    "Driver",
    "Farmer",
    "Student",
    "Marketing Executive",
    "Home Maker",
    "Other",
  ];

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    profession: "",
    customProfession: "",
    referralMarketingExecutiveName: "",
    referralMarketingExecutiveId: "",
  });

  // Create floating particles
  useEffect(() => {
    const particlesArray = [];
    for (let i = 0; i < 25; i++) {
      particlesArray.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.1,
        color: i % 4 === 0 ? "#8b5cf6" : i % 4 === 1 ? "#06b6d4" : i % 4 === 2 ? "#f59e0b" : "#10b981",
        opacity: Math.random() * 0.3 + 0.1,
      });
    }
    setParticles(particlesArray);

    // Floating real estate icons
    const icons = ["🏠", "🏢", "🏘️", "🏙️", "💰", "📈", "🔑", "📍"];
    const floatingIconsArray = icons.map((icon, i) => ({
      id: i,
      icon,
      x: Math.random() * 90 + 5,
      y: Math.random() * 90 + 5,
      size: Math.random() * 30 + 20,
      speed: Math.random() * 0.8 + 0.2,
      direction: Math.random() > 0.5 ? 1 : -1,
    }));
    setFloatingIcons(floatingIconsArray);
  }, []);

  // Animate particles and icons
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: (p.y + p.speed) % 100,
        x: (p.x + Math.sin(p.y * 0.05) * 0.3) % 100,
      })));

      setFloatingIcons(prev => prev.map(icon => ({
        ...icon,
        y: (icon.y + icon.speed * 0.5) % 100,
        x: (icon.x + Math.sin(icon.y * 0.03) * 0.5 * icon.direction + 100) % 100,
      })));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Update progress bar
  useEffect(() => {
    const widths = ["33%", "66%", "100%"];
    setProgressWidth(widths[step - 1]);
  }, [step]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMsg("❌ File size exceeds 5MB limit");
        return;
      }
      setVoterFile(file);
      setVoterFileName(file.name);
      // Animate file preview
      const preview = document.querySelector('.file-preview');
      if (preview) {
        preview.style.transform = "scale(1.05)";
        preview.style.boxShadow = "0 0 20px rgba(139, 92, 246, 0.5)";
        setTimeout(() => {
          preview.style.transform = "scale(1)";
          preview.style.boxShadow = "";
        }, 300);
      }
    }
  };

  // Clear selected file
  const clearFile = () => {
    setVoterFile(null);
    setVoterFileName("");
  };

  async function fileToBase64(file) {
    if (!file) return null;
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

async function handleSubmit(e) {
  e.preventDefault();
  setIsSubmitting(true);
  setMsg("Redirecting to payment...");

  if (!voterFile) {
    setMsg("❌ Please upload Voter ID for verification");
    setIsSubmitting(false);
    return;
  }

  const finalProfession =
    form.profession === "Other" ? form.customProfession : form.profession;

  try {
    const voterIdBase64 = await fileToBase64(voterFile);

    // 1️⃣ Create Cashfree order
    const { data } = await api.post("/payments/agent/create-order", {
      pendingAgent: { ...form, profession: finalProfession },
    });

    const paymentSessionId =
      data.paymentSessionId || data.payment_session_id;

    const { orderId, tempId } = data;

    if (!paymentSessionId) {
      throw new Error("Missing payment session id");
    }

    // 2️⃣ Load Cashfree SDK if not present
    if (!window.Cashfree) {
      await new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
        script.onload = resolve;
        document.body.appendChild(script);
      });
    }

    // 3️⃣ Store temp data
    sessionStorage.setItem("agentTempId", tempId);
    sessionStorage.setItem("agentOrderId", orderId);
    sessionStorage.setItem("agentVoterId", voterIdBase64);

    // ✅ 4️⃣ ENV-BASED MODE SWITCH
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
    setMsg("❌ Payment failed. Please try again.");
    setIsSubmitting(false);
  }
}


  const handleNext = () => {
    if (step === 1 && (!form.name || !form.email || !form.phone)) {
      setMsg("❌ Please fill all required fields");
      return;
    }
    if (step === 2 && (!form.password || !form.profession)) {
      setMsg("❌ Please fill all required fields");
      return;
    }
    setMsg("");
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
    setMsg("");
  };

  return (
    <div className="agent-bg">
      {/* Animated Background */}
      <div className="particles-container">
        {particles.map(p => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              opacity: p.opacity,
              animationDelay: `${p.id * 0.1}s`,
            }}
          />
        ))}
        {floatingIcons.map(icon => (
          <div
            key={icon.id}
            className="floating-icon"
            style={{
              left: `${icon.x}%`,
              top: `${icon.y}%`,
              fontSize: `${icon.size}px`,
              animationDelay: `${icon.id * 0.2}s`,
            }}
          >
            {icon.icon}
          </div>
        ))}
      </div>

      {/* Gradient Orbs */}
      <div className="gradient-orb top-right"></div>
      <div className="gradient-orb bottom-left"></div>

      <div className="agent-card">
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: progressWidth }}
            ></div>
          </div>
          <div className="progress-steps">
            <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Details</div>
            </div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Profile</div>
            </div>
            <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Payment</div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="header">
          <div className="logo-container">
            <div className="logo-icon">🏢</div>
            <div className="logo-glow"></div>
          </div>
          <h1>Property Dealer Registration</h1>
          <p className="subtitle">Join India's Premier Real Estate Network</p>
        </div>

        <form onSubmit={handleSubmit} className="form">
          {/* STEP 1 - Personal Details */}
          {step === 1 && (
            <div className="step-content slide-in">
              <h2 className="step-title">Personal Information</h2>
              
              <div className="input-group">
                <div className="input-icon">👤</div>
                <input 
                  name="name" 
                  placeholder="Full Name *" 
                  value={form.name}
                  onChange={handleChange} 
                  className="glow-input"
                  required 
                />
              </div>

              <div className="input-group">
                <div className="input-icon">📧</div>
                <input 
                  name="email" 
                  type="email" 
                  placeholder="Email Address *" 
                  value={form.email}
                  onChange={handleChange} 
                  className="glow-input"
                  required 
                />
              </div>

              <div className="input-group">
                <div className="input-icon">📱</div>
                <input 
                  name="phone" 
                  placeholder="Phone Number *" 
                  value={form.phone}
                  onChange={handleChange} 
                  className="glow-input"
                  required 
                />
              </div>

              <button 
                type="button" 
                onClick={handleNext}
                className="next-button"
              >
                Next Step →
              </button>
            </div>
          )}

          {/* STEP 2 - Profile Details */}
          {step === 2 && (
            <div className="step-content slide-in">
              <h2 className="step-title">Profile Setup</h2>
              
              <div className="input-group">
                <div className="input-icon">🔒</div>
                <input 
                  name="password" 
                  type="password" 
                  placeholder="Create Password *" 
                  value={form.password}
                  onChange={handleChange} 
                  className="glow-input"
                  required 
                />
              </div>

              <div className="input-group">
                <div className="input-icon">💼</div>
                <select 
                  name="profession" 
                  value={form.profession}
                  onChange={handleChange} 
                  className="glow-select"
                  required
                >
                  <option value="">Select Profession *</option>
                  {PROFESSIONS.map((p, i) => (
                    <option key={i} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {form.profession === "Other" && (
                <div className="input-group">
                  <div className="input-icon">✏️</div>
                  <input
                    name="customProfession"
                    placeholder="Specify Your Profession *"
                    value={form.customProfession}
                    onChange={handleChange}
                    className="glow-input"
                    required
                  />
                </div>
              )}

              <div className="referral-section">
                <h3 className="section-subtitle">Referral (Optional)</h3>
                <div className="input-group">
                  <div className="input-icon">👥</div>
                  <input
                    name="referralMarketingExecutiveName"
                    placeholder="Referral Executive Name"
                    value={form.referralMarketingExecutiveName}
                    onChange={handleChange}
                    className="glow-input"
                  />
                </div>
                <div className="input-group">
                  <div className="input-icon">🆔</div>
                  <input
                    name="referralMarketingExecutiveId"
                    placeholder="Marketing Executive ID"
                    value={form.referralMarketingExecutiveId}
                    onChange={handleChange}
                    className="glow-input"
                  />
                </div>
              </div>

              {/* File Upload */}
              <div className="file-upload-section">
                <h3 className="section-subtitle">Verification Document</h3>
                <div className="upload-area">
                  <label className="upload-label">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="file-input"
                    />
                    <div className="upload-box">
                      <div className="upload-icon">📁</div>
                      <p className="upload-text">Choose Voter ID File</p>
                      <p className="upload-hint">JPG, PNG or PDF • Max 5MB</p>
                    </div>
                  </label>
                  
                  {voterFileName && (
                    <div className="file-preview">
                      <div className="file-info">
                        <span className="file-icon">📄</span>
                        <span className="file-name">{voterFileName}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={clearFile}
                        className="clear-button"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="button-group">
                <button 
                  type="button" 
                  onClick={handleBack}
                  className="back-button"
                >
                  ← Back
                </button>
                <button 
                  type="button" 
                  onClick={handleNext}
                  className="next-button"
                >
                  Continue to Payment →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 - Payment */}
          {step === 3 && (
            <div className="step-content slide-in">
              <h2 className="step-title">Complete Registration</h2>
              
              <div className="payment-card">
                <div className="payment-icon">💰</div>
                <div className="payment-details">
                  <h3 className="payment-title">Registration Package</h3>
                  <div className="payment-amount">
                    <span className="currency">₹</span>
                    <span className="amount">1500</span>
                    <span className="period">/ year</span>
                  </div>
                  <ul className="features-list">
                    <li>✅ Premium Listing in Directory</li>
                    <li>✅ Lead Generation Access</li>
                    <li>✅ Property Management Tools</li>
                    <li>✅ Training & Support</li>
                    <li>✅ Marketing Resources</li>
                  </ul>
                </div>
              </div>

              <div className="summary-section">
                <h3 className="section-subtitle">Registration Summary</h3>
                <div className="summary-details">
                  <div className="summary-item">
                    <span>Name:</span>
                    <span>{form.name}</span>
                  </div>
                  <div className="summary-item">
                    <span>Email:</span>
                    <span>{form.email}</span>
                  </div>
                  <div className="summary-item">
                    <span>Profession:</span>
                    <span>{form.profession === "Other" ? form.customProfession : form.profession}</span>
                  </div>
                  <div className="summary-item">
                    <span>Verification:</span>
                    <span className={voterFile ? "verified" : "pending"}>
                      {voterFile ? "✅ Document Uploaded" : "⚠️ Pending"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="button-group">
                <button 
                  type="button" 
                  onClick={handleBack}
                  className="back-button"
                >
                  ← Edit Details
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`submit-button ${isSubmitting ? 'loading' : ''}`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner"></span>
                      Processing...
                    </>
                  ) : (
                    "Pay ₹1500 & Register"
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {msg && (
          <div className={`message ${msg.includes("✅") || msg.includes("🎉") ? 'success' : msg.includes("❌") ? 'error' : 'info'}`}>
            {msg}
          </div>
        )}

        <div className="footer">
          <p>Already registered? <span onClick={() => navigate("/agent-login")} className="login-link">Login here</span></p>
        </div>
      </div>

      {/* Enhanced CSS */}
      <style>{`
        .agent-bg {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .particles-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 1;
        }

        .particle {
          position: absolute;
          border-radius: 50%;
          animation: float 6s infinite ease-in-out;
          filter: blur(1px);
        }

        .floating-icon {
          position: absolute;
          opacity: 0.1;
          animation: float 8s infinite ease-in-out;
          filter: blur(0.5px);
        }

        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          animation: pulse 8s infinite;
        }

        .gradient-orb.top-right {
          top: -100px;
          right: -100px;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%);
        }

        .gradient-orb.bottom-left {
          bottom: -100px;
          left: -100px;
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%);
          animation-delay: -4s;
        }

        .agent-card {
          width: 100%;
          max-width: 520px;
          padding: 40px;
          border-radius: 24px;
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          color: #fff;
          position: relative;
          z-index: 2;
          animation: cardAppear 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes cardAppear {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .progress-container {
          margin-bottom: 30px;
        }

        .progress-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6, #06b6d4);
          border-radius: 3px;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(255, 255, 255, 0.2), 
            transparent);
          animation: shimmer 2s infinite;
        }

        .progress-steps {
          display: flex;
          justify-content: space-between;
          position: relative;
        }

        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .step-number {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 8px;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .progress-step.active .step-number {
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          color: white;
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
        }

        .step-label {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .progress-step.active .step-label {
          color: #8b5cf6;
          font-weight: 600;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo-container {
          position: relative;
          display: inline-block;
          margin-bottom: 20px;
        }

        .logo-icon {
          font-size: 60px;
          animation: float 3s infinite ease-in-out;
          filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.5));
        }

        .logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        h1 {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #fff 0%, #cbd5e1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
        }

        .subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          font-weight: 400;
        }

        .form {
          margin-top: 10px;
        }

        .step-content {
          animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .step-title {
          font-size: 20px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 25px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .input-group {
          position: relative;
          margin-bottom: 20px;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          color: rgba(255, 255, 255, 0.6);
          z-index: 2;
        }

        .glow-input, .glow-select {
          width: 100%;
          padding: 16px 16px 16px 48px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #2619daff;
          font-size: 15px;
          outline: none;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .glow-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          background-size: 20px;
          padding-right: 48px;
        }

        .glow-input:focus, .glow-select:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
          background: rgba(255, 255, 255, 0.08);
        }

        .glow-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .section-subtitle {
          font-size: 16px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin: 25px 0 15px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .referral-section {
          margin-top: 30px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .file-upload-section {
          margin-top: 25px;
        }

        .upload-area {
          margin-top: 15px;
        }

        .upload-label {
          cursor: pointer;
        }

        .file-input {
          display: none;
        }

        .upload-box {
          padding: 30px;
          border: 2px dashed rgba(139, 92, 246, 0.3);
          border-radius: 16px;
          text-align: center;
          transition: all 0.3s ease;
          background: rgba(139, 92, 246, 0.05);
        }

        .upload-box:hover {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
          transform: translateY(-2px);
        }

        .upload-icon {
          font-size: 40px;
          margin-bottom: 10px;
          opacity: 0.7;
        }

        .upload-text {
          font-size: 16px;
          font-weight: 500;
          color: #fff;
          margin-bottom: 5px;
        }

        .upload-hint {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .file-preview {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px;
          background: rgba(16, 185, 129, 0.1);
          border: 2px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
          margin-top: 15px;
          animation: slideIn 0.3s ease;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .file-icon {
          font-size: 20px;
        }

        .file-name {
          color: #10b981;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .clear-button {
          background: rgba(239, 68, 68, 0.8);
          color: white;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .clear-button:hover {
          background: rgba(239, 68, 68, 1);
          transform: scale(1.1);
        }

        .payment-card {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1));
          border: 2px solid rgba(139, 92, 246, 0.2);
          border-radius: 16px;
          padding: 25px;
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 25px;
        }

        .payment-icon {
          font-size: 40px;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .payment-details {
          flex: 1;
        }

        .payment-title {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 10px;
        }

        .payment-amount {
          display: flex;
          align-items: baseline;
          gap: 5px;
          margin-bottom: 15px;
        }

        .currency {
          font-size: 18px;
          color: #f59e0b;
          font-weight: 600;
        }

        .amount {
          font-size: 36px;
          font-weight: 700;
          color: #fff;
        }

        .period {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .features-list li {
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .features-list li::before {
          content: "•";
          color: #10b981;
          font-weight: bold;
        }

        .summary-section {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 25px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .summary-details {
          display: grid;
          gap: 12px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .summary-item span:first-child {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }

        .summary-item span:last-child {
          color: #fff;
          font-weight: 500;
        }

        .summary-item .verified {
          color: #10b981;
        }

        .summary-item .pending {
          color: #f59e0b;
        }

        .button-group {
          display: flex;
          gap: 15px;
          margin-top: 25px;
        }

        .next-button, .submit-button, .back-button {
          flex: 1;
          padding: 16px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .next-button, .submit-button {
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          color: white;
        }

        .next-button:hover:not(:disabled),
        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4);
        }

        .next-button:disabled,
        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .submit-button.loading {
          opacity: 0.8;
          cursor: wait;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .back-button {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .message {
          margin-top: 20px;
          padding: 15px;
          border-radius: 12px;
          text-align: center;
          font-weight: 500;
          animation: slideIn 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .message.success {
          background: rgba(16, 185, 129, 0.1);
          border: 2px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }

        .message.error {
          background: rgba(239, 68, 68, 0.1);
          border: 2px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .message.info {
          background: rgba(59, 130, 246, 0.1);
          border: 2px solid rgba(59, 130, 246, 0.3);
          color: #3b82f6;
        }

        .footer {
          margin-top: 25px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }

        .login-link {
          color: #8b5cf6;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          transition: color 0.3s ease;
        }

        .login-link:hover {
          color: #06b6d4;
        }

        /* Animations */
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes confetti {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--tx, 100px), 500px) rotate(var(--r, 360deg)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}