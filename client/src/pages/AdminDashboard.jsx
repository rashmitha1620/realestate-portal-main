// client/src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import api from "../api/api";
import { AuthAPI, AgentAPI, PropertyAPI, EnquiryAPI, MarketingExecutiveAPI } from "../api/apiService";
import PropertyForm from "./PropertyForm";
import AgentRegister from "./AgentRegister";
import UpdateAgentModal from "../components/UpdateAgentModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const [tab, setTab] = useState("home");
  const [admin, setAdmin] = useState(null);
  const [agents, setAgents] = useState([]);
  const [properties, setProperties] = useState([]);
  const [agentEnquiries, setAgentEnquiries] = useState([]);
  const [propertyEnquiries, setPropertyEnquiries] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [marketingExecs, setMarketingExecs] = useState([]);
  const [companies, setCompanies] = useState([]); // ✅ Company banners
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editAgent, setEditAgent] = useState(null);
  const [deleteAgent, setDeleteAgent] = useState(null);
  const [editCompany, setEditCompany] = useState(null);
  const [deleteCompany, setDeleteCompany] = useState(null);

  const navigate = useNavigate();

  const COLORS = ["#007bff", "#2ecc71", "#f39c12", "#e74c3c", "#9b59b6", "#6c5ce7"];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: me } = await AuthAPI.me();

        if (!me.isAdmin) {
          setMessage("❌ Access denied — Admins only.");
          setLoading(false);
          return;
        }
        setAdmin(me);

        // Parallel fetch with fallbacks
        const [
          agentsRes,
          propsRes,
          propEnqRes,
          agentEnqRes,
          referralsRes,
          marketingRes,
          companiesRes,
        ] = await Promise.all([
          AgentAPI.getAll().catch(() => ({ data: [] })),
          PropertyAPI.getAll().catch(() => ({ data: [] })),
          // Property enquiries
          EnquiryAPI.getAll()
            .catch(() => api.get("/enquiries").catch(() => ({ data: [] }))),
          // Agent enquiries
          (EnquiryAPI.adminAgentEnquiries ? EnquiryAPI.adminAgentEnquiries() : api.get("/enquiries/admin/agent-enquiries"))
            .catch(() => ({ data: [] })),
          api.get("/admin/referrals").catch(() => ({ data: [] })),
          (MarketingExecutiveAPI && MarketingExecutiveAPI.adminList
            ? MarketingExecutiveAPI.adminList()
            : api.get("/marketing-executive/admin/list")).catch(() => ({ data: [] })),
          api.get("/company-banners/admin/all").catch(() => ({ data: [] })),
        ]);

        const agentsData = Array.isArray(agentsRes.data) ? agentsRes.data : agentsRes.data?.items || [];
        const propsData = Array.isArray(propsRes.data) ? propsRes.data : propsRes.data?.items || [];
        const propEnqData = Array.isArray(propEnqRes.data) ? propEnqRes.data : propEnqRes.data?.items || [];
        const agentEnqData = Array.isArray(agentEnqRes.data) ? agentEnqRes.data : agentEnqRes.data?.items || [];

        setAgents(agentsData);
        setProperties(propsData);
        setPropertyEnquiries(propEnqData);
        setAgentEnquiries(agentEnqData);
        setReferrals(referralsRes.data || []);
        setMarketingExecs(marketingRes.data || []);
        setCompanies(companiesRes.data || []);
      } catch (err) {
        console.error("❌ Failed to load admin data:", err);
        setMessage("❌ Failed to load admin data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const refreshAgents = async () => {
    try {
      const { data } = await AgentAPI.getAll();
      setAgents(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error("Failed to refresh agents:", err);
    }
  };

  const refreshProperties = async () => {
    try {
      const { data } = await PropertyAPI.getAll();
      setProperties(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error("Failed to refresh properties:", err);
    }
  };

  const refreshCompanies = async () => {
    try {
      const { data } = await api.get("/company-banners/admin/all");
      setCompanies(data || []);
    } catch (err) {
      console.error("Failed to refresh companies:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  // ======= Company Form State =======
  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    priority: 1,
    image: null,
    services: "",
    serviceCategory: "",
    listingTypes: [],
    propertyTypes: [],
    operatingCities: "",
    phone: "",
    website: "",
    tagline: "",
    description: "",
    active: true,
  });

  // ======= Company Form Handlers =======
  const handleCompanyInputChange = (e) => {
    const { name, value } = e.target;
    setCompanyForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCompanyFileChange = (e) => {
    setCompanyForm(prev => ({ ...prev, image: e.target.files[0] }));
  };

  const toggleCompanyArray = (field, value) => {
    setCompanyForm(prev => {
      const currentArray = prev[field];
      if (currentArray.includes(value)) {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...currentArray, value] };
      }
    });
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    
    Object.keys(companyForm).forEach(key => {
      if (key === 'image' && companyForm[key]) {
        formData.append('image', companyForm.image);
      } else if (Array.isArray(companyForm[key])) {
        formData.append(key, JSON.stringify(companyForm[key]));
      } else if (key === 'services' && companyForm[key]) {
        const servicesArray = companyForm[key].split(',').map(s => s.trim()).filter(s => s);
        formData.append('services', JSON.stringify(servicesArray));
      } else if (key === 'operatingCities' && companyForm[key]) {
        const citiesArray = companyForm[key].split(',').map(c => c.trim()).filter(c => c);
        formData.append('operatingCities', JSON.stringify(citiesArray));
      } else {
        formData.append(key, companyForm[key]);
      }
    });

    try {
      if (editCompany) {
        await api.put(`/company-banners/${editCompany._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessage("✅ Company updated successfully!");
      } else {
        await api.post("/company-banners", formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessage("✅ Company created successfully!");
      }
      
      await refreshCompanies();
      
      setCompanyForm({
        companyName: "",
        priority: 1,
        image: null,
        services: "",
        serviceCategory: "",
        listingTypes: [],
        propertyTypes: [],
        operatingCities: "",
        phone: "",
        website: "",
        tagline: "",
        description: "",
        active: true,
      });
      setEditCompany(null);
      
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Company operation failed:", err);
      setMessage("❌ Operation failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleEditCompany = (company) => {
    setEditCompany(company);
    setCompanyForm({
      companyName: company.companyName || "",
      priority: company.priority || 1,
      image: null,
      services: Array.isArray(company.services) ? company.services.join(", ") : company.services || "",
      serviceCategory: company.serviceCategory || "",
      listingTypes: Array.isArray(company.listingTypes) ? company.listingTypes : [],
      propertyTypes: Array.isArray(company.propertyTypes) ? company.propertyTypes : [],
      operatingCities: Array.isArray(company.operatingCities) ? company.operatingCities.join(", ") : company.operatingCities || "",
      phone: company.phone || "",
      website: company.website || "",
      tagline: company.tagline || "",
      description: company.description || "",
      active: company.active !== false,
    });
    setTab("company-services");
  };

  const handleDeleteCompany = async (companyId) => {
    if (!window.confirm("Are you sure you want to delete this company?")) return;
    
    try {
      await api.delete(`/company-banners/${companyId}`);
      setMessage("✅ Company deleted successfully!");
      await refreshCompanies();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Delete company failed:", err);
      setMessage("❌ Delete failed: " + (err.response?.data?.message || err.message));
    }
  };

  const toggleCompanyStatus = async (companyId, currentStatus) => {
    try {
      await api.patch(`/company-banners/${companyId}`);
      setMessage(`✅ Company ${!currentStatus ? 'activated' : 'deactivated'}!`);
      await refreshCompanies();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Toggle status failed:", err);
      setMessage("❌ Operation failed");
    }
  };

  // ======= Analytics calculation =======
  const agentAnalytics = agents.map((agent) => {
    const aId = agent._id?.toString();

    const propertiesCount = properties.filter(
      (p) => (p.agent && (p.agent._id || p.agent)?.toString() === aId) || (p.owner && (p.owner._id || p.owner)?.toString() === aId)
    ).length;

    const enquiriesCount = agentEnquiries.filter((e) => {
      if (e.agent && (e.agent._id || e.agent)?.toString() === aId) return true;
      if (e.property && e.property.agent && (e.property.agent._id || e.property.agent)?.toString() === aId) return true;
      if (e.property && e.property._id && properties.find(p => (p._id?.toString() === e.property._id?.toString()) && ((p.agent && (p.agent._id || p.agent)?.toString() === aId) || (p.owner && (p.owner._id || p.owner)?.toString() === aId)))) return true;
      return false;
    }).length;

    return {
      name: agent.name || agent.email || "Unknown",
      properties: propertiesCount,
      enquiries: enquiriesCount,
      agentId: agent._id,
    };
  });

  const pieData = agentAnalytics.filter(a => a.enquiries > 0).map(a => ({ name: a.name, value: a.enquiries }));
  const barData = agentAnalytics.sort((x,y)=>y.properties - x.properties).slice(0, 10);

  // ======= Agent update / delete handlers =======
  const handleUpdateAgent = async (id, payload) => {
    try {
      await api.put(`/admin/agents/${id}`, payload);
      await refreshAgents();
      setEditAgent(null);
    } catch (err) {
      console.error("Update agent failed:", err);
      alert("Update failed");
    }
  };

  const handleDeleteAgent = async (id) => {
    try {
      await api.delete(`/admin/agents/${id}`);
      await refreshAgents();
      setDeleteAgent(null);
    } catch (err) {
      console.error("Delete agent failed:", err);
      alert("Delete failed");
    }
  };

  // ======= Marketing Executive performance =======
  const marketingPerf = marketingExecs.map((m) => ({
    _id: m._id,
    name: m.name,
    email: m.email,
    referredAgents: m.referredAgents || 0,
    referredProviders: m.referredProviders || 0,
    joined: m.joined || m.createdAt,
  }));

  if (loading) return <div style={styles.loadingWrap}><h3>Loading admin dashboard...</h3></div>;
  if (message && !message.includes("✅") && !message.includes("❌")) return <div style={styles.container}><p style={{ color: "red" }}>{message}</p></div>;

  return (
    <div style={styles.container}>
      {/* Success/Error Message */}
      {message && (
        <div style={{
          padding: "12px 16px",
          marginBottom: "16px",
          borderRadius: "8px",
          background: message.includes("✅") ? "#d1fae5" : "#fee2e2",
          color: message.includes("✅") ? "#065f46" : "#991b1b",
          border: `1px solid ${message.includes("✅") ? "#a7f3d0" : "#fecaca"}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{message}</span>
          <button onClick={() => setMessage("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>×</button>
        </div>
      )}

      {/* header */}
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>🧑‍💼 Admin Dashboard</h2>
          <div style={styles.subTitle}>{admin?.email}</div>
        </div>

        <div style={styles.headerActions}>
          <button style={styles.primaryBtn} onClick={() => setTab("home")}>Home</button>
          <button style={styles.ghostBtn} onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* nav */}
      <nav style={styles.nav}>
        {[
          { key: "home", label: "🏠 Home" },
          { key: "post", label: "🏡 Post Property" },
          { key: "add-agent", label: "➕ Add Property Dealer" },
          { key: "manage-agents", label: "👥 Manage Property Dealer" },
          { key: "company-services", label: "🏢 Company & Services" },
          { key: "enquiries", label: "📩 Enquiries" }, // ENQUIRIES TAB ADDED
          { key: "referrals", label: "🔗 Referrals" },
          { key: "marketing", label: "📈 Marketing Performance" },
          { key: "analytics", label: "📊 Analytics" },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              ...styles.navBtn,
              ...(tab === item.key ? styles.activeNav : {}),
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* content */}
      <main style={styles.main}>
        {/* HOME */}
        {tab === "home" && (
          <section style={styles.section}>
            <div style={styles.quickGrid}>
              <div style={styles.metricCard}>
                <div style={styles.metricNum}>{agents.length}</div>
                <div style={styles.metricLabel}>Property Dealers</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricNum}>{properties.length}</div>
                <div style={styles.metricLabel}>Properties</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricNum}>{companies.length}</div>
                <div style={styles.metricLabel}>Companies</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricNum}>{propertyEnquiries.length + agentEnquiries.length}</div>
                <div style={styles.metricLabel}>Total Enquiries</div>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3 style={{ marginBottom: 8 }}>Latest Referrals</h3>
              {referrals.length === 0 ? (
                <div style={styles.empty}>No referrals yet.</div>
              ) : (
                <div style={styles.smallTableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Referred By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.slice(0, 6).map(r => (
                        <tr key={r._id}>
                          <td>{r.name}</td>
                          <td>{r.email}</td>
                          <td>{r.serviceCategory}</td>
                          <td>{r.status}</td>
                          <td>{r.referralAgent?.name || r.referralMarketingExecutiveName || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* POST PROPERTY */}
        {tab === "post" && (
          <section style={styles.section}>
            <h3>Post New Property</h3>
            <div style={styles.cardContainer}><PropertyForm onPosted={refreshProperties} /></div>
          </section>
        )}

        {/* ADD AGENT */}
        {tab === "add-agent" && (
          <section style={styles.section}>
            <h3>Add Property Dealer</h3>
            <div style={styles.cardContainer}><AgentRegister onSaved={refreshAgents} /></div>
          </section>
        )}

        {/* MANAGE AGENTS */}
        {tab === "manage-agents" && (
          <section style={styles.section}>
            <h3>All Property Dealers</h3>
            {agents.length === 0 ? <div style={styles.empty}>No Property Dealer found.</div> : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Commission %</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map(a => (
                      <tr key={a._id}>
                        <td style={styles.agentLink} onClick={() => navigate(`/agent/${a._id}`)}>{a.name}</td>
                        <td>{a.email}</td>
                        <td>{a.phone}</td>
                        <td>{a.commissionPercent ?? 2}</td>
                        <td>
                          <button style={{ ...styles.smallBtn, ...styles.updateBtn }} onClick={() => setEditAgent(a)}>Update</button>
                          <button style={{ ...styles.smallBtn, ...styles.deleteBtn }} onClick={() => setDeleteAgent(a)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ✅ COMPANY & SERVICES TAB */}
        {tab === "company-services" && (
          <section style={styles.section}>
            <h3>{editCompany ? "Edit Company" : "Add Company Banner & Services"}</h3>
            
            <div style={styles.companyFormWrapper}>
              <form onSubmit={handleCompanySubmit} style={styles.companyForm}>
                <div style={styles.formTwoColumn}>
                  {/* Left Column */}
                  <div style={styles.formColumn}>
                    <div style={styles.formGroup}>
                      <label>Company Name *</label>
                      <input
                        type="text"
                        name="companyName"
                        placeholder="Enter company name"
                        value={companyForm.companyName}
                        onChange={handleCompanyInputChange}
                        required
                        style={styles.formInput}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label>Tagline</label>
                      <input
                        type="text"
                        name="tagline"
                        placeholder="Brief tagline"
                        value={companyForm.tagline}
                        onChange={handleCompanyInputChange}
                        style={styles.formInput}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label>Priority *</label>
                      <input
                        type="number"
                        name="priority"
                        min="1"
                        placeholder="1 = Highest"
                        value={companyForm.priority}
                        onChange={handleCompanyInputChange}
                        required
                        style={styles.formInput}
                      />
                      <small>Lower number = Higher priority in display</small>
                    </div>

                    <div style={styles.formGroup}>
                      <label>Service Category</label>
                      <select
                        name="serviceCategory"
                        value={companyForm.serviceCategory}
                        onChange={handleCompanyInputChange}
                        style={styles.formInput}
                      >
                        <option value="">Select Category</option>
                        <option value="Real Estate Agency">Real Estate Agency</option>
                        <option value="Builder & Developer">Builder & Developer</option>
                        <option value="Legal & Documentation">Legal & Documentation</option>
                        <option value="Interior & Construction">Interior & Construction</option>
                        <option value="Loan & Finance">Loan & Finance</option>
                        <option value="Property Management">Property Management</option>
                        <option value="Home Inspection">Home Inspection</option>
                        <option value="Architecture & Design">Architecture & Design</option>
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label>Services Offered</label>
                      <textarea
                        name="services"
                        placeholder="Enter services, separated by commas"
                        value={companyForm.services}
                        onChange={handleCompanyInputChange}
                        rows="3"
                        style={styles.formInput}
                      />
                      <small>e.g., Property Buying, Selling, Renting, Legal Consultation</small>
                    </div>

                    <div style={styles.formGroup}>
                      <label>Operating Cities</label>
                      <input
                        type="text"
                        name="operatingCities"
                        placeholder="Cities separated by commas"
                        value={companyForm.operatingCities}
                        onChange={handleCompanyInputChange}
                        style={styles.formInput}
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div style={styles.formColumn}>
                    <div style={styles.formGroup}>
                      <label>Contact Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Contact number"
                        value={companyForm.phone}
                        onChange={handleCompanyInputChange}
                        style={styles.formInput}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label>Website</label>
                      <input
                        type="url"
                        name="website"
                        placeholder="https://example.com"
                        value={companyForm.website}
                        onChange={handleCompanyInputChange}
                        style={styles.formInput}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label>Description</label>
                      <textarea
                        name="description"
                        placeholder="Company description"
                        value={companyForm.description}
                        onChange={handleCompanyInputChange}
                        rows="4"
                        style={styles.formInput}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label>Listing Types</label>
                      <div style={styles.checkboxGroup}>
                        {["Sell", "Rent", "Lease", "PG", "Farm Lease"].map((type) => (
                          <label key={type} style={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={companyForm.listingTypes.includes(type)}
                              onChange={() => toggleCompanyArray('listingTypes', type)}
                              style={styles.checkbox}
                            />
                            {type}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={styles.formGroup}>
                      <label>Property Types</label>
                      <div style={styles.checkboxGroup}>
                        {["Apartment", "Villa", "Open Plot", "Commercial", "Farmland"].map((type) => (
                          <label key={type} style={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={companyForm.propertyTypes.includes(type)}
                              onChange={() => toggleCompanyArray('propertyTypes', type)}
                              style={styles.checkbox}
                            />
                            {type}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={styles.formGroup}>
                      <label>Company Image *</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCompanyFileChange}
                        required={!editCompany}
                        style={styles.formInput}
                      />
                      <small>{editCompany ? "Leave empty to keep existing image" : "Upload company logo or banner"}</small>
                    </div>

                    <div style={styles.formGroup}>
                      <label>
                        <input
                          type="checkbox"
                          checked={companyForm.active}
                          onChange={(e) => setCompanyForm(prev => ({ ...prev, active: e.target.checked }))}
                          style={styles.checkbox}
                        />
                        Active (Visible on website)
                      </label>
                    </div>
                  </div>
                </div>

                <div style={styles.formActions}>
                  <button type="submit" style={styles.submitBtn}>
                    {editCompany ? "💾 Update Company" : "🚀 Add Company"}
                  </button>
                  {editCompany && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditCompany(null);
                        setCompanyForm({
                          companyName: "",
                          priority: 1,
                          image: null,
                          services: "",
                          serviceCategory: "",
                          listingTypes: [],
                          propertyTypes: [],
                          operatingCities: "",
                          phone: "",
                          website: "",
                          tagline: "",
                          description: "",
                          active: true,
                        });
                      }}
                      style={styles.cancelBtn}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Companies List */}
            <div style={{ marginTop: 40 }}>
              <h3>Existing Companies ({companies.length})</h3>
              
              {companies.length === 0 ? (
                <div style={styles.empty}>No companies added yet.</div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Logo</th>
                        <th>Company Name</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Services</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map(company => (
                        <tr key={company._id}>
                          <td>
                            {company.image && (
                              <img 
                                src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}${company.image}`} 
                                alt={company.companyName}
                                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                              />
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 'bold' }}>{company.companyName}</div>
                            {company.tagline && (
                              <div style={{ fontSize: 12, color: '#666' }}>{company.tagline}</div>
                            )}
                          </td>
                          <td>{company.serviceCategory}</td>
                          <td>{company.priority}</td>
                          <td>
                            <div style={{ maxWidth: 200, fontSize: 12 }}>
                              {Array.isArray(company.services) 
                                ? company.services.slice(0, 3).join(', ') + (company.services.length > 3 ? '...' : '')
                                : company.services}
                            </div>
                          </td>
                          <td>
                            <span 
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                backgroundColor: company.active ? '#d1fae5' : '#fecaca',
                                color: company.active ? '#065f46' : '#991b1b'
                              }}
                            >
                              {company.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                style={{ ...styles.smallBtn, ...styles.updateBtn }}
                                onClick={() => handleEditCompany(company)}
                              >
                                Edit
                              </button>
                              <button 
                                style={{ ...styles.smallBtn, ...styles.statusBtn }}
                                onClick={() => toggleCompanyStatus(company._id, company.active)}
                              >
                                {company.active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button 
                                style={{ ...styles.smallBtn, ...styles.deleteBtn }}
                                onClick={() => handleDeleteCompany(company._id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ✅ ENQUIRIES TAB - RESTORED */}
        {tab === "enquiries" && (
          <section style={styles.section}>
            <div style={{ marginBottom: 24 }}>
              <h3>All Enquiries</h3>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <div style={{
                  padding: '12px 16px',
                  background: '#f0f9ff',
                  borderRadius: '8px',
                  flex: 1
                }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0369a1' }}>{agentEnquiries.length}</div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Property Dealer Enquiries</div>
                </div>
                <div style={{
                  padding: '12px 16px',
                  background: '#f0fdf4',
                  borderRadius: '8px',
                  flex: 1
                }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>{propertyEnquiries.length}</div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Property Enquiries</div>
                </div>
                <div style={{
                  padding: '12px 16px',
                  background: '#fef3c7',
                  borderRadius: '8px',
                  flex: 1
                }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d97706' }}>{agentEnquiries.length + propertyEnquiries.length}</div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Total Enquiries</div>
                </div>
              </div>
            </div>

            {/* Property Dealer Enquiries */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ marginBottom: 16 }}>Property Dealer Enquiries ({agentEnquiries.length})</h3>
              {agentEnquiries.length === 0 ? (
                <div style={styles.empty}>No Property Dealer enquiries.</div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Contact</th>
                        <th>Message</th>
                        <th>Property Dealer</th>
                        <th>Property</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentEnquiries.map(e => (
                        <tr key={e._id}>
                          <td><strong>{e.name}</strong></td>
                          <td>
                            <div>{e.phone || 'No phone'}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>{e.email}</div>
                          </td>
                          <td style={{ maxWidth: 300 }}>
                            <div style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }} title={e.message}>
                              {e.message}
                            </div>
                          </td>
                          <td>
                            {e.agent && (e.agent.name || e.agent.email) ? (
                              <span style={{ color: '#2563eb', cursor: 'pointer' }}>
                                {e.agent.name || e.agent.email}
                              </span>
                            ) : e.property?.agent && e.property.agent.name ? (
                              <span style={{ color: '#2563eb', cursor: 'pointer' }}>
                                {e.property.agent.name}
                              </span>
                            ) : "—"}
                          </td>
                          <td>
                            {e.property?.title ? (
                              <span style={{ color: '#059669', cursor: 'pointer' }}>
                                {e.property.title}
                              </span>
                            ) : "—"}
                          </td>
                          <td>
                            <div style={{ fontSize: '12px' }}>
                              {new Date(e.createdAt).toLocaleDateString()}
                            </div>
                            <div style={{ fontSize: '11px', color: '#999' }}>
                              {new Date(e.createdAt).toLocaleTimeString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Property Enquiries */}
            <div>
              <h3 style={{ marginBottom: 16 }}>Property Enquiries ({propertyEnquiries.length})</h3>
              {propertyEnquiries.length === 0 ? (
                <div style={styles.empty}>No property enquiries.</div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Contact</th>
                        <th>Message</th>
                        <th>Property</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {propertyEnquiries.map(e => (
                        <tr key={e._id}>
                          <td><strong>{e.name}</strong></td>
                          <td>
                            <div>{e.phone || 'No phone'}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>{e.email}</div>
                          </td>
                          <td style={{ maxWidth: 300 }}>
                            <div style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }} title={e.message}>
                              {e.message}
                            </div>
                          </td>
                          <td>
                            {e.property?.title ? (
                              <span style={{ color: '#059669', cursor: 'pointer' }}>
                                {e.property.title}
                              </span>
                            ) : "—"}
                          </td>
                          <td>
                            <div style={{ fontSize: '12px' }}>
                              {new Date(e.createdAt).toLocaleDateString()}
                            </div>
                            <div style={{ fontSize: '11px', color: '#999' }}>
                              {new Date(e.createdAt).toLocaleTimeString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* REFERRALS */}
        {tab === "referrals" && (
          <section style={styles.section}>
            <h3>Referred Service Providers</h3>
            {referrals.length === 0 ? <div style={styles.empty}>No referrals.</div> : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Referred By</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map(r => (
                      <tr key={r._id}>
                        <td>{r.name}</td>
                        <td>{r.email}</td>
                        <td>{r.serviceCategory}</td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: r.status === 'active' ? '#d1fae5' : 
                                           r.status === 'pending' ? '#fef3c7' : '#f3f4f6',
                            color: r.status === 'active' ? '#065f46' : 
                                   r.status === 'pending' ? '#92400e' : '#6b7280'
                          }}>
                            {r.status}
                          </span>
                        </td>
                        <td>{r.referralAgent?.name || r.referralMarketingExecutiveName || "—"}</td>
                        <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* MARKETING PERFORMANCE */}
        {tab === "marketing" && (
          <section style={styles.section}>
            <h3>Marketing Executive Performance</h3>
            <div style={{ marginBottom: 14 }}>
              <p style={{ color: "#555" }}>Table shows total referrals created by each marketing executive.</p>
            </div>
            <div style={styles.card}>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Referred Property Dealers</th>
                      <th>Referred Providers</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketingPerf.map(m => (
                      <tr key={m._id}>
                        <td>{m.name}</td>
                        <td>{m.email}</td>
                        <td>{m.referredAgents}</td>
                        <td>{m.referredProviders}</td>
                        <td>{m.joined ? new Date(m.joined).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={styles.chartsRow}>
                <div style={styles.chartCard}>
                  <h4 style={{ marginBottom: 8 }}>Property Dealers Referred</h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={marketingPerf.map(m => ({ name: m.name, value: m.referredAgents }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#007bff" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={styles.chartCard}>
                  <h4 style={{ marginBottom: 8 }}>Providers Referred</h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={marketingPerf.filter(m => m.referredProviders > 0).map(m => ({ name: m.name, value: m.referredProviders }))}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={80}
                        label
                      >
                        {marketingPerf.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ANALYTICS */}
        {tab === "analytics" && (
          <section style={styles.section}>
            <h3>Analytics</h3>
            <div style={styles.analyticsGrid}>
              <div style={styles.chartCard}>
                <h4>Properties per Property Dealer</h4>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="properties" fill="#2ecc71" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.chartCard}>
                <h4>Enquiries per Property Dealer</h4>
                {pieData.length === 0 ? <div style={styles.empty}>No enquiry data to show</div> : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={110} label>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* modals */}
      <UpdateAgentModal
        open={!!editAgent}
        agent={editAgent}
        onClose={() => setEditAgent(null)}
        onSaved={async (payload) => {
          if (!editAgent) return;
          await handleUpdateAgent(editAgent._id, payload);
        }}
      />

      <DeleteConfirmModal
        open={!!deleteAgent}
        agent={deleteAgent}
        onClose={() => setDeleteAgent(null)}
        onDeleted={async () => {
          if (!deleteAgent) return;
          await handleDeleteAgent(deleteAgent._id);
        }}
      />
    </div>
  );
}

/* ------------------ STYLES ------------------ */
const styles = {
  container: {
    padding: 24,
    maxWidth: 1400,
    margin: "auto",
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  },
  loadingWrap: { 
    padding: 40, 
    textAlign: "center",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh'
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: '1px solid #e5e7eb'
  },
  title: { margin: 0, fontSize: 26, color: "#111827", fontWeight: 700 },
  subTitle: { color: "#6b7280", fontSize: 14, marginTop: 4 },
  headerActions: { display: "flex", gap: 12, alignItems: "center" },

  primaryBtn: {
    background: "linear-gradient(135deg, #7b2ff7, #6a1cd6)",
    color: "#fff",
    padding: "10px 20px",
    border: "none",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(123,47,247,0.2)",
    cursor: "pointer",
    transition: "all 0.2s",
    fontWeight: 600,
  },
  ghostBtn: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    padding: "10px 20px",
    borderRadius: 8,
    cursor: "pointer",
    color: "#374151",
    transition: "all 0.2s",
    fontWeight: 500,
  },

  nav: { 
    display: "flex", 
    gap: 8, 
    marginBottom: 24, 
    flexWrap: "wrap",
    overflowX: "auto",
    paddingBottom: 12,
  },
  navBtn: {
    background: "#f3f4f6",
    border: "none",
    padding: "10px 16px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    whiteSpace: "nowrap",
    transition: "all 0.2s",
    fontWeight: 500,
  },
  activeNav: { 
    background: "linear-gradient(135deg, #111827, #374151)", 
    color: "#fff", 
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    fontWeight: "600",
  },

  main: { 
    minHeight: 600,
    width: "100%",
  },
  section: { 
    marginTop: 8,
    animation: 'fadeIn 0.3s ease'
  },

  quickGrid: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
    gap: 16,
  },
  metricCard: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
    textAlign: "center",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  metricNum: { 
    fontSize: 28, 
    fontWeight: 700, 
    color: "#111827",
    marginBottom: 8
  },
  metricLabel: { 
    color: "#6b7280", 
    fontSize: 14,
    fontWeight: 500
  },

  cardContainer: { display: "flex", gap: 12 },
  card: { 
    padding: 24, 
    borderRadius: 12, 
    background: "#fff", 
    boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
    marginTop: 16,
  },

  // Company Form Styles
  companyFormWrapper: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
    marginTop: 16,
    marginBottom: 24,
  },
  companyForm: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  formTwoColumn: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 32,
  },
  formColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  formInput: {
    padding: "12px 16px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 14,
    transition: "all 0.2s",
    width: "100%",
  },
  checkboxGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 8,
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    cursor: "pointer",
    userSelect: 'none'
  },
  checkbox: {
    margin: 0,
    cursor: "pointer",
    width: 16,
    height: 16,
  },
  formActions: {
    display: "flex",
    gap: 16,
    marginTop: 8,
    justifyContent: 'flex-end'
  },
  submitBtn: {
    background: "linear-gradient(135deg, #7b2ff7, #6a1cd6)",
    color: "#fff",
    padding: "14px 28px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "600",
    fontSize: 14,
    transition: "all 0.2s",
    minWidth: 180,
  },
  cancelBtn: {
    background: "#f3f4f6",
    color: "#374151",
    padding: "14px 28px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "600",
    fontSize: 14,
    transition: "all 0.2s",
    minWidth: 120,
  },

  tableWrap: { 
    overflowX: "auto", 
    marginTop: 16, 
    background: "#fff", 
    borderRadius: 8, 
    padding: 0,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)" 
  },
  smallTableWrap: { overflowX: "auto", marginTop: 16 },
  table: { 
    width: "100%", 
    borderCollapse: "collapse", 
    fontSize: 14,
  },
  agentLink: { 
    color: "#2563eb", 
    cursor: "pointer", 
    fontWeight: 600,
    textDecoration: "none",
    transition: 'color 0.2s',
  },

  empty: { 
    padding: 40, 
    color: "#6b7280", 
    background: "#f8fafc", 
    borderRadius: 10,
    textAlign: "center",
    fontStyle: "italic",
    fontSize: 15,
  },

  smallBtn: { 
    padding: "8px 12px", 
    borderRadius: 6, 
    border: "none", 
    cursor: "pointer", 
    fontSize: 12,
    fontWeight: "600",
    transition: "all 0.2s",
  },
  updateBtn: { 
    background: "linear-gradient(135deg, #06b6d4, #0891b2)", 
    color: "#fff",
  },
  deleteBtn: { 
    background: "linear-gradient(135deg, #ef4444, #dc2626)", 
    color: "#fff",
  },
  statusBtn: {
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    color: "#fff",
  },

  chartsRow: { 
    display: "flex", 
    gap: 24, 
    marginTop: 32, 
    flexWrap: "wrap" 
  },
  chartCard: { 
    flex: 1, 
    minWidth: 350, 
    padding: 20, 
    borderRadius: 12, 
    background: "#fff", 
    boxShadow: "0 4px 16px rgba(0,0,0,0.05)" 
  },

  analyticsGrid: { 
    display: "grid", 
    gridTemplateColumns: "1fr 1fr", 
    gap: 32,
    marginTop: 16,
  },
};

// Add hover effects
Object.assign(styles.primaryBtn, {
  "&:hover": {
    background: "linear-gradient(135deg, #6a1cd6, #5a17b8)",
    transform: "translateY(-1px)",
    boxShadow: "0 6px 16px rgba(123,47,247,0.3)",
  }
});

Object.assign(styles.ghostBtn, {
  "&:hover": {
    background: "#f9fafb",
    borderColor: "#d1d5db",
  }
});

Object.assign(styles.navBtn, {
  "&:hover": {
    background: "#e5e7eb",
  }
});

Object.assign(styles.metricCard, {
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "0 8px 25px rgba(15,23,42,0.12)",
  }
});

Object.assign(styles.submitBtn, {
  "&:hover": {
    background: "linear-gradient(135deg, #6a1cd6, #5a17b8)",
    transform: "translateY(-2px)",
    boxShadow: "0 6px 16px rgba(123,47,247,0.3)",
  }
});

Object.assign(styles.cancelBtn, {
  "&:hover": {
    background: "#e5e7eb",
    borderColor: "#d1d5db",
  }
});

Object.assign(styles.updateBtn, {
  "&:hover": { 
    background: "linear-gradient(135deg, #0891b2, #0e7490)",
    transform: "translateY(-1px)"
  }
});

Object.assign(styles.deleteBtn, {
  "&:hover": { 
    background: "linear-gradient(135deg, #dc2626, #b91c1c)",
    transform: "translateY(-1px)"
  }
});

Object.assign(styles.statusBtn, {
  "&:hover": { 
    background: "linear-gradient(135deg, #d97706, #b45309)",
    transform: "translateY(-1px)"
  }
});

Object.assign(styles.agentLink, {
  "&:hover": { 
    color: "#1d4ed8",
    textDecoration: "underline"
  }
});

// Add animation
const fadeIn = `
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

// Add the animation to the document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = fadeIn;
  document.head.appendChild(style);
}

// Responsive styles
if (typeof window !== 'undefined') {
  const mediaQueries = `
    @media (max-width: 1200px) {
      .analyticsGrid {
        grid-template-columns: 1fr;
      }
    }
    
    @media (max-width: 900px) {
      .formTwoColumn {
        grid-template-columns: 1fr;
        gap: 20px;
      }
      
      .quickGrid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        gap: 16px;
        text-align: center;
      }
      
      .headerActions {
        width: 100%;
        justify-content: center;
      }
      
      .nav {
        justify-content: center;
      }
      
      .quickGrid {
        grid-template-columns: 1fr;
      }
      
      .chartsRow {
        flex-direction: column;
      }
      
      .chartCard {
        min-width: 100%;
      }
    }
  `;
  
  const style = document.createElement('style');
  style.textContent = mediaQueries;
  document.head.appendChild(style);
}