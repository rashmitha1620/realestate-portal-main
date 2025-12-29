import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const navigate = useNavigate();

  // Load user info from localStorage
  useEffect(() => {
    const loadUser = () => {
      console.log("🔄 Navbar loading user info...");
      
      // Check all possible user storage locations
      const userStr = localStorage.getItem("user");
      const agentUserStr = localStorage.getItem("agentUser");
      const providerUserStr = localStorage.getItem("providerUser");
      const marketingUserStr = localStorage.getItem("marketingUser");
      const adminUserStr = localStorage.getItem("adminUser");
      
      const userType = localStorage.getItem("userType");
      
      console.log("📋 Navbar storage check:", {
        userStr,
        agentUserStr: !!agentUserStr,
        providerUserStr: !!providerUserStr,
        marketingUserStr: !!marketingUserStr,
        adminUserStr: !!adminUserStr,
        userType
      });

      // Priority 1: Check marketing executive (meToken + user)
      const meToken = localStorage.getItem("meToken");
      if (meToken && userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          if (parsedUser.isMarketing === true) {
            setUser(parsedUser);
            setUserType("marketing-executive");
            console.log("✅ Navbar: Marketing executive loaded");
            return;
          }
        } catch (e) {
          console.error("Error parsing user:", e);
        }
      }
      
      // Priority 2: Check agent
      if (agentUserStr) {
        try {
          const parsedUser = JSON.parse(agentUserStr);
          setUser(parsedUser);
          setUserType("agent");
          console.log("✅ Navbar: Agent loaded");
          return;
        } catch (e) {
          console.error("Error parsing agent:", e);
        }
      }
      
      // Priority 3: Check service provider
      if (providerUserStr) {
        try {
          const parsedUser = JSON.parse(providerUserStr);
          setUser(parsedUser);
          setUserType("service-provider");
          console.log("✅ Navbar: Service provider loaded");
          return;
        } catch (e) {
          console.error("Error parsing provider:", e);
        }
      }
      
      // Priority 4: Check admin
      if (adminUserStr) {
        try {
          const parsedUser = JSON.parse(adminUserStr);
          setUser(parsedUser);
          setUserType("admin");
          console.log("✅ Navbar: Admin loaded");
          return;
        } catch (e) {
          console.error("Error parsing admin:", e);
        }
      }
      
      // Priority 5: Check generic user
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          setUser(parsedUser);
          setUserType(userType || parsedUser.role || parsedUser.userType);
          console.log("✅ Navbar: Generic user loaded");
          return;
        } catch (e) {
          console.error("Error parsing generic user:", e);
        }
      }
      
      // No user found
      console.log("❌ Navbar: No user found");
      setUser(null);
      setUserType(null);
    };

    loadUser();
    
    // Listen for storage changes
    window.addEventListener("storage", loadUser);
    
    return () => {
      window.removeEventListener("storage", loadUser);
    };
  }, []);

  const handleLogout = () => {
    console.log("🚪 Navbar logout");
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    setUserType(null);
    navigate("/");
    window.location.reload(); // Force refresh
  };

  const navStyle = {
    background: "#fff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    padding: "10px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "sticky",
    top: 0,
    zIndex: 999,
  };

  const linkStyle = {
    textDecoration: "none",
    color: "#333",
    fontWeight: 500,
    margin: "0 10px",
    padding: "8px 12px",
    borderRadius: "4px",
    transition: "all 0.2s",
  };

  const btnStyle = {
    background: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    padding: "8px 16px",
    cursor: "pointer",
    marginLeft: "10px",
  };

  // Debug info
  console.log("🎯 Navbar render state:", { user, userType });

  return (
    <nav style={navStyle}>
      <div style={{ fontWeight: "bold", fontSize: "20px", color: "#007bff" }}>
        🏠 RealEstate 24X7
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        {/* ===========================
            PUBLIC NAVIGATION (No user logged in)
        ============================ */}
        {!user && (
          <>
            <Link to="/" style={linkStyle}>Home</Link>
            <Link to="/services" style={linkStyle}>Services</Link>
            <Link to="/service-provider-login" style={linkStyle}>
              Service Provider Login
            </Link>
            <Link to="/agent-login" style={linkStyle}>Agent Login</Link>
            <Link to="/marketing-executive/login" style={linkStyle}>
              Marketing Login
            </Link>
            <Link to="/admin-login" style={linkStyle}>Admin Login</Link>
          </>
        )}

        {/* ===========================
            AGENT NAVIGATION
        ============================ */}
        {(userType === "agent" || (user && (user.role === "agent" || user.userType === "agent"))) && (
          <>
            <Link to="/" style={linkStyle}>Home</Link>
            <Link to="/property-form" style={linkStyle}>Post Property</Link>
            <Link to="/agent-dashboard" style={linkStyle}>My Properties</Link>
            <Link to="/view-enquiries" style={linkStyle}>Enquiries</Link>
            <Link to="/service-provider-register" style={linkStyle}>
              Create Service Provider
            </Link>
            <button onClick={handleLogout} style={btnStyle}>Logout</button>
          </>
        )}

        {/* ===========================
            SERVICE PROVIDER NAVIGATION
        ============================ */}
        {(userType === "service-provider" || (user && (user.role === "service-provider" || user.userType === "service-provider"))) && (
          <>
            <Link to="/service-provider-dashboard" style={linkStyle}>
              Dashboard
            </Link>
            <Link to="/service-upload" style={linkStyle}>
              Upload Service
            </Link>
            <Link to="/service-my-services" style={linkStyle}>
              My Services
            </Link>
            <Link to="/service-provider-enquiries" style={linkStyle}>
              Enquiries
            </Link>
            <button
              onClick={handleLogout}
              style={{ ...btnStyle, background: "#e67e22" }}
            >
              Logout
            </button>
          </>
        )}

        {/* ===========================
            MARKETING EXECUTIVE NAVIGATION
        ============================ */}
        {(userType === "marketing-executive" || (user && user.isMarketing === true)) && (
          <>
            <Link to="/marketing-executive/dashboard" style={linkStyle}>
              Dashboard
            </Link>
            <Link to="/marketing-executive/referrals" style={linkStyle}>
              Referred Agents
            </Link>
            <Link to="/marketing-executive/referrals/service-providers" style={linkStyle}>
              Referred Providers
            </Link>
            <button
              onClick={handleLogout}
              style={{ ...btnStyle, background: "#9b59b6" }}
            >
              Logout
            </button>
          </>
        )}

        {/* ===========================
            ADMIN NAVIGATION
        ============================ */}
        {(userType === "admin" || (user && (user.role === "admin" || user.userType === "admin" || user.isAdmin === true))) && (
          <>
            <Link to="/" style={linkStyle}>Home</Link>
            <Link to="/admin-dashboard" style={linkStyle}>Admin Dashboard</Link>
            <Link to="/admin-manage-agents" style={linkStyle}>Manage Agents</Link>
            <Link to="/admin-service-providers" style={linkStyle}>
              Manage Service Providers
            </Link>
            <Link to="/admin-enquiries" style={linkStyle}>
              All Enquiries
            </Link>
            <Link to="/analytics" style={linkStyle}>
              Analytics
            </Link>
            <button
              onClick={handleLogout}
              style={{ ...btnStyle, background: "#e74c3c" }}
            >
              Logout
            </button>
          </>
        )}

        {/* ===========================
            DEBUG INFO (Only in development)
        ============================ */}
        {process.env.NODE_ENV === "development" && user && (
          <div style={{
            fontSize: "12px",
            color: "#666",
            marginLeft: "15px",
            padding: "4px 8px",
            background: "#f0f0f0",
            borderRadius: "4px"
          }}>
            Role: {userType || user.role || user.userType || "unknown"}
          </div>
        )}
      </div>
    </nav>
  );
}