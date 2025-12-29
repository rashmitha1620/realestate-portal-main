import React, { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  /* =========================================================
     LOAD USER + THEME
  ========================================================= */
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));

    const storedTheme = localStorage.getItem("theme") === "dark";
    setDarkMode(storedTheme);
    document.body.classList.toggle("dark", storedTheme);
  }, []);

  /* =========================================================
     LOGOUT FIX
  ========================================================= */
  const handleLogout = () => {
    // remove ALL tokens
    localStorage.removeItem("adminToken");
    localStorage.removeItem("agentToken");
    localStorage.removeItem("providerToken");
    localStorage.removeItem("marketingExecutiveToken");
    localStorage.removeItem("meToken");

    // remove all user info
    localStorage.removeItem("user");
    localStorage.removeItem("agentUser");
    localStorage.removeItem("providerUser");
    localStorage.removeItem("meUser");

    setUser(null);
    navigate("/");
  };

  /* =========================================================
     DARK MODE
  ========================================================= */
  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    localStorage.setItem("theme", newVal ? "dark" : "light");
    document.body.classList.toggle("dark", newVal);
  };

  /* =========================================================
      FIXED ROLE DETECTION (no undefined problem)
  ========================================================= */
  const isAdmin = user?.isAdmin || false;
  const isAgent = user?.isAgent || false;
  const isService = user?.isService || false;
  const isMarketing = user?.isMarketing || false;

  const getLinkClass = (path) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <div className="app-container">
      <header className="navbar">
        <h2 className="brand" onClick={() => navigate("/")}>
          🏡 RealEstate 24X7
        </h2>

        {/* Dark Mode Toggle */}
        <button className="dark-toggle" onClick={toggleDarkMode}>
          {darkMode ? "🌙" : "☀️"}
        </button>

        {/* Mobile Hamburger */}
        <div
          className={`hamburger ${mobileMenu ? "open" : ""}`}
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* ================= DESKTOP MENU ================= */}
        <nav className="nav-menu desktop-menu">
          {/* PUBLIC MENU */}
          {!isAdmin && !isAgent && !isService && !isMarketing && (
            <>
              <Link to="/" className={getLinkClass("/")}>Home</Link>

              

              <Link to="/service-home" className={getLinkClass("/service-home")}>
                Services
              </Link>

              {/* Marketing Executive */}
              <div className="dropdown">
                <span className="nav-link">Marketing Executive ▾</span>
                <div className="dropdown-content">
                  <Link to="/marketing-executive/login">Login</Link>
                  <Link to="/marketing-executive/register">Register</Link>
                </div>
              </div>

              {/* Login */}
              <div className="dropdown">
                <span className="nav-link">Login ▾</span>
                <div className="dropdown-content">
                  <Link to="/agent-login">Property Dealer Login</Link>
                  <Link to="/service-provider-login">Service Login</Link>
                </div>
              </div>

              {/* Register */}
              <div className="dropdown">
                <span className="nav-link">Register ▾</span>
                <div className="dropdown-content">
                  <Link to="/agent-register">Property Dealer Register</Link>
                  <Link to="/service-provider-register">Service Register</Link>
                </div>
              </div>

              <Link to="/admin-login" className={getLinkClass("/admin-login")}>
                Admin Login
              </Link>

               {/* ⭐ ABOUT DROPDOWN (BEST UX) */}
    <div className="dropdown">
      <span className="nav-link">About ▾</span>
      <div className="dropdown-content">
        <Link to="/about">About Us</Link>
        <Link to="/contact">Contact Us</Link>
        <Link to="/terms">Terms & Conditions</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/refund">Refund Policy</Link>
      </div>
    </div>
            </>
          )}

          {/* ================= AGENT MENU ================= */}
          {isAgent && (
            <>
              <Link to="/" className={getLinkClass("/")}>Home</Link>
              <Link to="/property-form">Post Property</Link>
              <Link to="/view-properties">My Properties</Link>
              <Link to="/view-enquiries">View Enquiries</Link>
              <Link to={`/agent/${user?._id}`}>Profile</Link>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </>
          )}

          {/* ================= SERVICE PROVIDER MENU ================= */}
          {isService && (
            <>
              <Link to="/service-home">Service Home</Link>
              <Link to="/service-upload">Upload Service</Link>
              <Link to="/service-my-services">My Services</Link>
              <Link to="/service-provider-enquiries">View Enquiries</Link>
              <Link to={`/service-provider/${user?._id}`}>Profile</Link>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </>
          )}

          {/* ================= ADMIN MENU ================= */}
          {isAdmin && (
            <>
              <Link to="/">Home</Link>
              <Link to="/admin-dashboard">Manage Agents</Link>
              <Link to="/admin-service-providers">Manage Providers</Link>
              <Link to="/admin-enquiries">Enquiries</Link>
              <Link to="/analytics">Analytics</Link>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </>
          )}

          {/* ================= MARKETING EXECUTIVE MENU ================= */}
          {isMarketing && (
            <>
              <Link to="/marketing-executive/dashboard">Dashboard</Link>
              <Link to="/marketing-executive/referrals">Referred Agents</Link>

              <Link to="/marketing-executive/referrals/service-providers">Reffered Service Providers</Link>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </>
          )}
        </nav>

        {/* ================= MOBILE MENU ================= */}
        <div className={`mobile-menu ${mobileMenu ? "show" : ""}`}>
          {!isAdmin && !isAgent && !isService && !isMarketing && (
            <>
              <Link to="/" onClick={() => setMobileMenu(false)}>Home</Link>
              <Link to="/service-home" onClick={() => setMobileMenu(false)}>Services</Link>

              <p className="menu-title">Marketing Executive</p>
              <Link to="/marketing-executive/login">Login</Link>
              <Link to="/marketing-executive/register">Register</Link>

              <p className="menu-title">Login</p>
              <Link to="/agent-login">Property Dealer Login</Link>
              <Link to="/service-provider-login">Service Login</Link>

              <p className="menu-title">Register</p>
              <Link to="/agent-register">Property Dealer Register</Link>
              <Link to="/service-provider-register">Service Register</Link>

              <Link to="/admin-login">Admin Login</Link>
            </>
          )}

          {isAgent && (
            <>
              <Link to="/">Home</Link>
              <Link to="/property-form">Post Property</Link>
              <Link to="/view-properties">My Properties</Link>
              <Link to="/view-enquiries">Enquiries</Link>
              <Link to={`/agent/${user?._id}`}>Profile</Link>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </>
          )}

          {isService && (
            <>
              <Link to="/service-home">Home</Link>
              <Link to="/service-upload">Upload Service</Link>
              <Link to="/service-my-services">My Services</Link>
              <Link to={`/service-provider/${user?._id}`}>Profile</Link>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </>
          )}

          {isAdmin && (
            <>
              <Link to="/">Home</Link>
              <Link to="/admin-dashboard">Manage Agents</Link>
              <Link to="/admin-service-providers">Manage Providers</Link>
              <Link to="/admin-enquiries">Enquiries</Link>
              <Link to="/analytics">Analytics</Link>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </>
          )}

          {isMarketing && (
            <>
              <Link to="/marketing-executive/dashboard">Dashboard</Link>
              <Link to="/marketing-executive/referred-agents">Referred Agents</Link>
              <Link to={`/marketing-executive/${user?._id}`}>Profile</Link>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      </header>

      <main className="page-content fade-in">
        <Outlet />
      </main>
    </div>
  );
}
