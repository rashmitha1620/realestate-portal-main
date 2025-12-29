import React, { useEffect, useState, useRef } from "react";
import api from "../api/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function AnalyticsDashboard() {
  const [agents, setAgents] = useState([]);
  const [providers, setProviders] = useState([]);
  const [properties, setProperties] = useState([]);
  const [services, setServices] = useState([]);
  const [enquiries, setEnquiries] = useState([]);

  const COLORS = ["#6C63FF", "#00C49F", "#FFBB28", "#FF6F61", "#845EC2"];

  const reportRef = useRef(null);

  /* ============================
      LOAD ALL ANALYTICS DATA
  ============================== */
  useEffect(() => {
    async function load() {
      try {
        const agentsRes = await api.get("/agents");
        const providerRes = await api.get("/service-provider/all-providers");
        const propertyRes = await api.get("/properties");
        const serviceRes = await api.get("/service-provider");
        const enquiryRes = await api.get("/enquiries");

        const prop = enquiryRes.data.propertyEnquiries || [];
        const serv = enquiryRes.data.serviceEnquiries || [];

        setAgents(agentsRes.data || []);
        setProviders(providerRes.data || []);
        setProperties(propertyRes.data || []);
        setServices(serviceRes.data || []);
        setEnquiries([
          ...prop.map((e) => ({ ...e, __type: "property" })),
          ...serv.map((e) => ({ ...e, __type: "service" })),
        ]);
      } catch (err) {
        console.error("Analytics load failed:", err);
      }
    }
    load();
  }, []);

  /* ============================
      PREMIUM VISUAL DATA
  ============================== */

  const agentStats = agents.map((a) => ({
    name: a.name,
    properties: properties.filter((p) => p.agent?._id === a._id).length,
    enquiries: enquiries.filter((e) => e.agent?._id === a._id).length,
  }));

  const providerStats = providers.map((p) => ({
    name: p.name,
    services: services.filter((s) => s.provider?._id === p._id).length,
    enquiries: enquiries.filter((e) => e.provider?._id === p._id).length,
  }));

  const monthlyStats = Array.from({ length: 12 }).map((_, i) => {
    const m = new Date(0, i).toLocaleString("default", { month: "short" });
    return {
      month: m,
      properties: properties.filter((p) => new Date(p.createdAt).getMonth() === i).length,
      enquiries: enquiries.filter((e) => new Date(e.createdAt).getMonth() === i).length,
      services: services.filter((s) => new Date(s.createdAt).getMonth() === i).length,
    };
  });

  /* ============================
      EXPORT PDF
  ============================== */
  const downloadPDF = async () => {
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const img = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(img, "PNG", 0, 0, width, height);
    pdf.save("Analytics_Report.pdf");
  };

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📊 Analytics Dashboard</h1>
          <p style={styles.subtitle}>RealEstate Portal – Advanced Insights</p>
        </div>

        <button style={styles.pdfBtn} onClick={downloadPDF}>
          📄 Download Report
        </button>
      </div>

      {/* WRAPPER FOR EXPORT */}
      <div ref={reportRef} style={styles.reportWrapper}>

        {/* SUMMARY CARDS */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3>Total Agents</h3>
            <p style={styles.statValue}>{agents.length}</p>
          </div>

          <div style={styles.statCard}>
            <h3>Total Providers</h3>
            <p style={styles.statValue}>{providers.length}</p>
          </div>

          <div style={styles.statCard}>
            <h3>Total Properties</h3>
            <p style={styles.statValue}>{properties.length}</p>
          </div>

          <div style={styles.statCard}>
            <h3>Total Services</h3>
            <p style={styles.statValue}>{services.length}</p>
          </div>
        </div>

        {/* AGENT BAR CHART */}
        <div style={styles.chartCard}>
          <h3>Agent – Properties & Enquiries</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={agentStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" tick={{ fill: "#f0f0f0" }} />
              <YAxis tick={{ fill: "#f0f0f0" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="properties" fill="#6C63FF" />
              <Bar dataKey="enquiries" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PROVIDER BAR CHART */}
        <div style={styles.chartCard}>
          <h3>Service Provider – Services & Enquiries</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={providerStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" tick={{ fill: "#f0f0f0" }} />
              <YAxis tick={{ fill: "#f0f0f0" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="services" fill="#FFBB28" />
              <Bar dataKey="enquiries" fill="#FF6F61" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* MONTHLY LINE CHART */}
        <div style={styles.chartCardFull}>
          <h3>Monthly Activity Overview</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#555" />
              <XAxis dataKey="month" tick={{ fill: "#f0f0f0" }} />
              <YAxis tick={{ fill: "#f0f0f0" }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="properties" stroke="#6C63FF" strokeWidth={2} />
              <Line type="monotone" dataKey="services" stroke="#FFBB28" strokeWidth={2} />
              <Line type="monotone" dataKey="enquiries" stroke="#00C49F" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* 🎨 PREMIUM GLASS UI STYLES */
const styles = {
  page: {
    padding: "35px",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1e1e2f, #2a2d3e)",
    color: "#fff",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 30,
    alignItems: "center",
  },
  title: { fontSize: 32, margin: 0 },
  subtitle: { opacity: 0.8, marginTop: 5 },
  pdfBtn: {
    background: "linear-gradient(135deg, #6C63FF, #3D3AFE)",
    padding: "10px 20px",
    borderRadius: 10,
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: 16,
  },
  reportWrapper: {
    backdropFilter: "blur(12px)",
    background: "rgba(255,255,255,0.08)",
    padding: "25px",
    borderRadius: 16,
    boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
    marginBottom: 40,
  },
  statCard: {
    background: "rgba(255,255,255,0.12)",
    padding: 20,
    borderRadius: 12,
    textAlign: "center",
    boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
  },
  statValue: {
    fontSize: 32,
    marginTop: 10,
    fontWeight: "bold",
  },
  chartCard: {
    marginTop: 30,
    padding: 20,
    background: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    boxShadow: "0 5px 20px rgba(0,0,0,0.25)",
  },
  chartCardFull: {
    marginTop: 40,
    padding: 25,
    background: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    boxShadow: "0 5px 20px rgba(0,0,0,0.25)",
  },
};
