// client/src/pages/ViewEnquiries.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

/*
  ViewEnquiries.jsx
  - Multi-role (admin / agent / service-provider)
  - Filters + Search + Sort + Pagination
  - Export CSV / Excel
  - Modal detail view + slide-in side panel
  - Admin charts (enquiries/day, by category, top providers)
*/

export default function ViewEnquiries() {
  const [rawEnquiries, setRawEnquiries] = useState([]); // master data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all/property/service
  const [cityFilter, setCityFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  // sorting
  const [sortBy, setSortBy] = useState("createdAt"); // createdAt, name, price
  const [sortDir, setSortDir] = useState("desc"); // asc, desc

  // pagination
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // modal / side-panel
  const [detailModal, setDetailModal] = useState(null); // enquiry object
  const [sidePanel, setSidePanel] = useState(null);

  // role detection via tokens
  const isAdmin = !!localStorage.getItem("adminToken");
  const isAgent = !!localStorage.getItem("agentToken");
  const isProvider = !!localStorage.getItem("providerToken");

  // load data depending on role
useEffect(() => {
  async function load() {
    setLoading(true);
    setError("");

    try {
      let combined = [];

      // ⭐ ADMIN → sees both types
      if (isAdmin) {
        const res = await api.get("/enquiries");

        const prop = res.data.propertyEnquiries || [];
        const serv = res.data.serviceEnquiries || [];

        combined = [
          ...prop.map((e) => ({ ...e, __type: "property" })),
          ...serv.map((e) => ({ ...e, __type: "service" }))
        ];
      }

      // ⭐ AGENT → sees only their property enquiries
      else if (isAgent) {
        const res = await api.get("/enquiries/my-enquiries");

        const prop = res.data.propertyEnquiries || [];

        combined = prop.map((e) => ({ ...e, __type: "property" }));
      }

      // ⭐ SERVICE PROVIDER → sees only their service enquiries
     else if (isProvider) {
  const res = await api.get("/service-enquiries/my-enquiries");

  const serv = Array.isArray(res.data) ? res.data : [];

  combined = serv.map((e) => ({ ...e, __type: "service" }));
}


      setRawEnquiries(combined);
    } catch (err) {
      console.error("Failed to load enquiries:", err);
      setError("Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  }

  load();
}, []);


  // derived: all unique cities/providers used in filters
  const uniqueCities = useMemo(() => {
    const s = new Set(rawEnquiries.map((e) => (e.__city || "").toString().trim()).filter(Boolean));
    return [...s].sort();
  }, [rawEnquiries]);

  const uniqueProviders = useMemo(() => {
    const s = new Set(rawEnquiries.map((e) => (e.provider?.name || "").trim()).filter(Boolean));
    return [...s].sort();
  }, [rawEnquiries]);

  const uniqueAgents = useMemo(() => {
    const s = new Set(rawEnquiries.map((e) => (e.agent?.name || "").trim()).filter(Boolean));
    return [...s].sort();
  }, [rawEnquiries]);

  // Filtering
  const filtered = useMemo(() => {
    let list = [...rawEnquiries];

    // type filter
    if (typeFilter === "property") list = list.filter((e) => e.__type === "property");
    if (typeFilter === "service") list = list.filter((e) => e.__type === "service");

    // city
    if (cityFilter) list = list.filter((e) => (e.__city || "").toLowerCase().includes(cityFilter.toLowerCase()));

    // provider & agent filter
    if (providerFilter) list = list.filter((e) => (e.provider?.name || "").toLowerCase().includes(providerFilter.toLowerCase()));
    if (agentFilter) list = list.filter((e) => (e.agent?.name || "").toLowerCase().includes(agentFilter.toLowerCase()));

    // name/phone
    if (nameFilter) list = list.filter((e) => (e.name || "").toLowerCase().includes(nameFilter.toLowerCase()));
    if (phoneFilter) list = list.filter((e) => (e.phone || "").toLowerCase().includes(phoneFilter.toLowerCase()));

    // date range
    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter((e) => new Date(e.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      // include entire day
      to.setHours(23, 59, 59, 999);
      list = list.filter((e) => new Date(e.createdAt) <= to);
    }

    // price range (using __price)
    if (priceMin) list = list.filter((e) => Number(e.__price || 0) >= Number(priceMin));
    if (priceMax) list = list.filter((e) => Number(e.__price || 0) <= Number(priceMax));

    // global search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        ((e.name || "") + " " + (e.phone || "") + " " + (e.service?.title || "") + " " + (e.property?.title || "") + " " + (e.provider?.name || "") + " " + (e.agent?.name || ""))
          .toLowerCase()
          .includes(q)
      );
    }

    // sorting
    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "createdAt") return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
      if (sortBy === "name") return ((a.name || "") > (b.name || "")) ? dir : -dir;
      if (sortBy === "price") return (Number(a.__price || 0) - Number(b.__price || 0)) * dir;
      return 0;
    });

    return list;
  }, [
    rawEnquiries,
    typeFilter,
    cityFilter,
    providerFilter,
    agentFilter,
    nameFilter,
    phoneFilter,
    dateFrom,
    dateTo,
    priceMin,
    priceMax,
    search,
    sortBy,
    sortDir,
  ]);

  // pagination controls
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  // utils: export CSV
  function exportCSV(rows = filtered, filename = "enquiries.csv") {
    const header = [
      "Type",
      "Service/Property",
      "Provider/Agent",
      "Customer Name",
      "Phone",
      "Email",
      "Message",
      "Price",
      "City",
      "Date",
    ];
    const csvRows = [header.join(",")];
    rows.forEach((r) => {
      const type = r.__type === "service" ? "Service" : "Property";
      const title = (r.service?.title || r.property?.title || "").replace(/"/g, '""');
      const providerName = (r.provider?.name || r.agent?.name || "").replace(/"/g, '""');
      const name = (r.name || "").replace(/"/g, '""');
      const phone = r.phone || "";
      const email = r.email || "";
      const message = (r.message || "").replace(/"/g, '""');
      const price = r.__price || "";
      const city = r.__city || "";
      const date = new Date(r.createdAt).toISOString();
      const row = [
        `"${type}"`,
        `"${title}"`,
        `"${providerName}"`,
        `"${name}"`,
        `"${phone}"`,
        `"${email}"`,
        `"${message}"`,
        `"${price}"`,
        `"${city}"`,
        `"${date}"`,
      ].join(",");
      csvRows.push(row);
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
  }

  // utils: export XLSX
  function exportXLSX(rows = filtered, filename = "enquiries.xlsx") {
    // create worksheet data
    const wsData = rows.map((r) => ({
      Type: r.__type === "service" ? "Service" : "Property",
      Title: r.service?.title || r.property?.title || "",
      Provider: r.provider?.name || r.agent?.name || "",
      Name: r.name || "",
      Phone: r.phone || "",
      Email: r.email || "",
      Message: r.message || "",
      Price: r.__price || "",
      City: r.__city || "",
      Date: new Date(r.createdAt).toISOString(),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Enquiries");
    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), filename);
  }

  // Charts data (admin only) - compute from filtered/all
  const chartsData = useMemo(() => {
    if (!isAdmin) return null;
    const data = filtered; // admin likely uses full filtered data for charting

    // enquiries per day (last 30 days)
    const perDay = {};
    data.forEach((e) => {
      const d = new Date(e.createdAt);
      const key = d.toISOString().slice(0, 10);
      perDay[key] = (perDay[key] || 0) + 1;
    });
    const perDayArr = Object.keys(perDay)
      .sort()
      .map((k) => ({ date: k, count: perDay[k] }));

    // enquiries per category (if service has category) - fallback to type
    const perCategory = {};
    data.forEach((e) => {
      const cat = (e.service?.category || e.property?.category || e.__type || "Unknown").toString();
      perCategory[cat] = (perCategory[cat] || 0) + 1;
    });
    const perCategoryArr = Object.keys(perCategory).map((k) => ({ name: k, value: perCategory[k] }));

    // top providers/agents
    const byProvider = {};
    data.forEach((e) => {
      const name = (e.provider?.name || e.agent?.name || "Unknown").toString();
      byProvider[name] = (byProvider[name] || 0) + 1;
    });
    const topProviders = Object.keys(byProvider)
      .map((k) => ({ name: k, value: byProvider[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { perDayArr, perCategoryArr, topProviders };
  }, [filtered, isAdmin]);

  // small helpers
  const resetFilters = () => {
    setTypeFilter("all");
    setCityFilter("");
    setProviderFilter("");
    setAgentFilter("");
    setNameFilter("");
    setPhoneFilter("");
    setDateFrom("");
    setDateTo("");
    setPriceMin("");
    setPriceMax("");
    setSearch("");
    setSortBy("createdAt");
    setSortDir("desc");
    setPage(1);
  };

  // open detail modal / side-panel
  const openDetail = (enq) => {
    setDetailModal(enq);
    setSidePanel(enq);
  };

  // table header click sort helper
  const toggleSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  if (loading) return <h3 style={{ textAlign: "center", marginTop: 30 }}>Loading...</h3>;
  if (error) return <p style={{ textAlign: "center", color: "red" }}>{error}</p>;

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>📨 Enquiries</h2>

      {/* TOP CONTROLS */}
      <div style={styles.controls}>
        <input
          placeholder="Search name/phone/service/provider..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={styles.search}
        />

        <div style={styles.selectRow}>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} style={styles.select}>
            <option value="all">All Types</option>
            <option value="property">Property</option>
            <option value="service">Service</option>
          </select>

          <select value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); setPage(1); }} style={styles.select}>
            <option value="">All Cities</option>
            {uniqueCities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={providerFilter} onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }} style={styles.select}>
            <option value="">All Providers</option>
            {uniqueProviders.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={agentFilter} onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }} style={styles.select}>
            <option value="">All Agents</option>
            {uniqueAgents.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div style={styles.rowWrap}>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={styles.date} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={styles.date} />

          <input placeholder="Min price" value={priceMin} onChange={(e)=>setPriceMin(e.target.value)} style={styles.smallInput}/>
          <input placeholder="Max price" value={priceMax} onChange={(e)=>setPriceMax(e.target.value)} style={styles.smallInput}/>

          <button onClick={resetFilters} style={styles.ghostBtn}>Reset</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => exportCSV(pageData, `enquiries-page-${page}.csv`)} style={styles.btn}>Export CSV (page)</button>
          <button onClick={() => exportCSV(filtered, "enquiries-filtered.csv")} style={styles.btn}>Export CSV (filtered)</button>

          <button onClick={() => exportXLSX(pageData, `enquiries-page-${page}.xlsx`)} style={styles.btn}>Export XLSX (page)</button>
          <button onClick={() => exportXLSX(filtered, "enquiries-filtered.xlsx")} style={styles.btn}>Export XLSX (filtered)</button>

          <div style={{ marginLeft: 12 }}>
            <label>Page size: </label>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* ADMIN CHARTS */}
      {isAdmin && chartsData && (
        <div style={styles.chartsWrap}>
          <div style={styles.chartBox}>
            <h4>Enquiries per Day</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartsData.perDayArr}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0a66c2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={styles.chartBox}>
            <h4>By Category / Type</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartsData.perCategoryArr}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2ecc71" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={styles.chartBox}>
            <h4>Top Providers/Agents</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Legend />
                <Pie data={chartsData.topProviders} dataKey="value" nameKey="name" outerRadius={70} fill="#8884d8">
                  {chartsData.topProviders.map((entry, idx) => (
                    <Cell key={idx} fill={["#0088FE", "#00C49F", "#FFBB28", "#FF8042"][idx % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Type</th>
              <th style={styles.th} onClick={()=>toggleSort("price")}>Item {sortBy==="price" ? (sortDir==="asc"?"▲":"▼"):""}</th>
              <th style={styles.th}>Provider/Agent</th>
              <th style={styles.th} onClick={()=>toggleSort("name")}>Customer {sortBy==="name" ? (sortDir==="asc"?"▲":"▼"):""}</th>
              <th style={styles.th}>Message</th>
              <th style={styles.th} onClick={()=>toggleSort("createdAt")}>Date {sortBy==="createdAt" ? (sortDir==="asc"?"▲":"▼"):""}</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {pageData.map((e, idx) => (
              <tr key={e._id} style={{ ...(idx % 2 === 0 ? styles.zebra : {}) }}>
                <td style={styles.td}>{e.__type === "service" ? "🛠 Service" : "🏠 Property"}</td>

                <td style={styles.td}>
                  <strong style={{ display: "block" }}>{e.service?.title || e.property?.title || "N/A"}</strong>
                  <small style={{ color: "#666" }}>₹{Number(e.__price || 0).toLocaleString()}</small>
                  <div style={{ marginTop: 6, color: "#777" }}>{e.__city}</div>
                </td>

                <td style={styles.td}>
                  <strong>{e.provider?.name || e.agent?.name || "-"}</strong>
                  <div style={{ color: "#666" }}>{e.provider?.email || e.agent?.email || ""}</div>
                </td>

                <td style={styles.td}>
                  {e.name} <br />
                  <small style={{ color: "#666" }}>{e.phone}</small>
                </td>

                <td style={styles.td}>
                  <div style={{ maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.message || "—"}
                  </div>
                </td>

                <td style={styles.td}>{new Date(e.createdAt).toLocaleString()}</td>

                <td style={styles.td}>
                  <button style={styles.linkBtn} onClick={() => openDetail(e)}>View</button>
                  <button style={styles.linkBtn} onClick={() => setSidePanel(e)}>Panel</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={styles.pager}>
        <div>
          Page {page} of {totalPages} — {total} results
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setPage(1)} disabled={page===1} style={styles.pagerBtn}>First</button>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={styles.pagerBtn}>Prev</button>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={styles.pagerBtn}>Next</button>
          <button onClick={() => setPage(totalPages)} disabled={page===totalPages} style={styles.pagerBtn}>Last</button>
        </div>
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div style={styles.modalWrap} onClick={() => setDetailModal(null)}>
          <div style={styles.modal} onClick={(e)=>e.stopPropagation()}>
            <h3>{detailModal.service?.title || detailModal.property?.title}</h3>
            <p><b>Customer:</b> {detailModal.name} • {detailModal.phone}</p>
            <p><b>Message:</b></p>
            <p style={{ whiteSpace: "pre-wrap" }}>{detailModal.message || "No message"}</p>
            <p style={{ color: "#777" }}>{new Date(detailModal.createdAt).toLocaleString()}</p>
            <div style={{ marginTop: 10 }}>
              <button onClick={() => { navigator.clipboard.writeText(detailModal.phone || ""); alert("Phone copied"); }} style={styles.btn}>Copy Phone</button>
              <button onClick={() => setDetailModal(null)} style={styles.ghostBtn}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Side Panel */}
      {sidePanel && (
        <div style={styles.sidePanel}>
          <button style={styles.sideClose} onClick={() => setSidePanel(null)}>✕</button>
          <h3>Details</h3>
          <div><b>Type:</b> {sidePanel.__type}</div>
          <div><b>Item:</b> {sidePanel.service?.title || sidePanel.property?.title}</div>
          <div><b>Provider/Agent:</b> {sidePanel.provider?.name || sidePanel.agent?.name}</div>
          <div><b>Customer:</b> {sidePanel.name}</div>
          <div><b>Phone:</b> {sidePanel.phone}</div>
          <div style={{ marginTop: 10 }}><b>Message:</b><div style={{ whiteSpace: "pre-wrap" }}>{sidePanel.message}</div></div>
          <div style={{ marginTop: 10, color: "#777" }}>{new Date(sidePanel.createdAt).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

/* -------------------- STYLES -------------------- */
const styles = {
  page: { padding: 24, fontFamily: "Inter, Arial, sans-serif" },
  heading: { fontSize: 24, textAlign: "center", marginBottom: 18 },

  controls: {
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  search: { padding: 10, borderRadius: 8, border: "1px solid #ddd", fontSize: 15, width: "100%" },

  selectRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 },
  select: { padding: 8, borderRadius: 8, border: "1px solid #ddd", minWidth: 150 },

  rowWrap: { display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" },
  date: { padding: 8, borderRadius: 8, border: "1px solid #ddd" },
  smallInput: { padding: 8, borderRadius: 8, border: "1px solid #ddd", width: 110 },

  ghostBtn: { padding: "8px 12px", borderRadius: 8, background: "transparent", border: "1px solid #ccc", cursor: "pointer" },
  btn: { padding: "8px 12px", borderRadius: 8, background: "#0a66c2", color: "#fff", border: "none", cursor: "pointer" },

  chartsWrap: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 18, marginBottom: 18 },

  chartBox: { background: "#fff", padding: 12, borderRadius: 10, boxShadow: "0 4px 14px rgba(0,0,0,0.06)" },

  tableWrap: { background: "#fff", borderRadius: 8, boxShadow: "0 4px 14px rgba(0,0,0,0.06)", overflowX: "auto" },

  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  thead: { position: "sticky", top: 0, zIndex: 5, background: "#fff" },
  th: { padding: 12, borderBottom: "1px solid #eee", textAlign: "left", cursor: "pointer" },
  td: { padding: 12, borderBottom: "1px solid #f2f2f2", verticalAlign: "top" },
  zebra: { background: "#fbfbfb" },

  pager: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  pagerBtn: { padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer" },

  linkBtn: { background: "transparent", border: "none", color: "#0a66c2", cursor: "pointer", padding: 4, marginRight: 6 },

  modalWrap: {
    position: "fixed", left: 0, top: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
  },
  modal: { background: "#fff", padding: 20, borderRadius: 10, width: 620, maxHeight: "80vh", overflowY: "auto" },

  sidePanel: {
    position: "fixed", right: 0, top: 0, width: 360, height: "100vh", background: "#fff", padding: 20,
    boxShadow: "-6px 0 20px rgba(0,0,0,0.08)", zIndex: 9998
  },
  sideClose: { position: "absolute", left: 12, top: 12, border: "none", background: "transparent", fontSize: 18, cursor: "pointer" }
};
