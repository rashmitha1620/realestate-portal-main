import React, { useEffect, useState } from "react";
import api from "../api/api"; // ✅ Import your api client
import { fixMediaUrl } from "../utils/fixMediaUrl";


import { ServiceProviderAPI } from "../api/apiService";

export default function ServiceProviderEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await ServiceProviderAPI.myServiceEnquiries();
        setEnquiries(res.data);
        setFiltered(res.data);
      } catch (err) {
        console.error("Failed to load enquiries:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Search filter
  useEffect(() => {
    const f = enquiries.filter((e) =>
  `${e.name || ""} ${e.phone || ""} ${e.service?.title || ""}`
    .toLowerCase()
    .includes(search.toLowerCase())
);

    setFiltered(f);
  }, [search, enquiries]);

  if (loading) return <h3 style={{ textAlign: "center", marginTop: 30 }}>Loading...</h3>;

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>📩 Customer Enquiries</h2>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search by name, phone or service..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {filtered.length === 0 ? (
        <p style={{ textAlign: "center", marginTop: 20, color: "#555" }}>
          No enquiries found.
        </p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Service</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Message</th>
                <th style={styles.th}>Date</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((e) => (
                <tr key={e._id} style={styles.tr}>
                  {/* Service Info */}
                  <td style={styles.td}>
                    <div style={styles.serviceBox}>
                      <img
  src={
    e.service?.images?.[0]
      ? fixMediaUrl(e.service.images[0])
      : "/no-image.png"
  }
  alt="service"
  style={styles.serviceImg}
  onError={(ev) => {
    ev.target.onerror = null;
    ev.target.src = "/no-image.png";
  }}
/>

                      <div>
                        <strong>{e.service?.title || "N/A"}</strong> <br />
                        <small style={{ color: "#777" }}>
  ₹{e.service?.price ?? "N/A"}
</small>

                      </div>
                    </div>
                  </td>

                  {/* Customer */}
                  <td style={styles.td}>
                    {e.name} <br />
                    <small>{e.phone}</small>
                  </td>

                  {/* Message */}
                  <td style={styles.td}>{e.message || "No message"}</td>

                  {/* Date */}
                  <td style={styles.td}>
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ==========================
        STYLES 
=========================== */
const styles = {
  container: {
    padding: "30px",
    maxWidth: "1100px",
    margin: "auto",
  },

  heading: {
    textAlign: "center",
    fontSize: 28,
    marginBottom: 20,
  },

  search: {
    width: "100%",
    padding: "12px",
    marginBottom: 20,
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 16,
  },

  tableWrapper: {
    overflowX: "auto",
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    padding: 12,
    background: "#f5f5f5",
    textAlign: "left",
    fontWeight: 600,
    fontSize: 15,
  },

  tr: {
    borderBottom: "1px solid #eee",
  },

  td: {
    padding: 12,
    fontSize: 14,
    verticalAlign: "top",
  },

  serviceBox: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },

  serviceImg: {
    width: 70,
    height: 70,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid #ddd",
  },
};

