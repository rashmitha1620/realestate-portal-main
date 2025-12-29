import React, { useEffect, useState } from "react";
import { ServiceProviderAPI } from "../api/apiService";
import { useNavigate } from "react-router-dom";
import { fixMediaUrl } from "../utils/fixMediaUrl";

function MyServices() {
  const [services, setServices] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  /* ================= LOAD SERVICES ================= */
  useEffect(() => {
    async function load() {
      try {
        const res = await ServiceProviderAPI.myServices();
        setServices(res.data || []);
      } catch (err) {
        console.error("❌ Failed to load services:", err);
      }
    }
    load();
  }, []);

  /* ================= DELETE SERVICE ================= */
  async function handleDelete(id) {
    try {
      setDeletingId("loading");
      await ServiceProviderAPI.deleteService(id);
      setServices((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      console.error("❌ Delete failed:", err);
      alert("Delete failed. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>My Uploaded Services</h2>

      {services.length === 0 && (
        <p style={styles.empty}>No services uploaded yet.</p>
      )}

      {/* ================= SERVICE GRID ================= */}
      <div style={styles.grid}>
        {services.map((s) => (
          <div key={s._id} style={styles.card}>
            <img
              src={s.images?.[0] ? fixMediaUrl(s.images[0]) : "/no-image.png"}
              alt={s.title}
              style={styles.image}
              onError={(e) => (e.target.src = "/no-image.png")}
            />

            <div style={styles.cardBody}>
              <h3 style={styles.cardTitle}>{s.title}</h3>

              <span style={styles.price}>
                ₹ {s.price ?? "N/A"}
              </span>

              <p style={styles.desc}>
                {s.description?.slice(0, 120) || "No description"}
                {s.description?.length > 120 && "..."}
              </p>

              <div style={styles.actions}>
                <button
                  style={styles.editBtn}
                  onClick={() => navigate(`/service/edit/${s._id}`)}
                >
                  ✏️ Edit
                </button>

                <button
                  style={styles.deleteBtn}
                  onClick={() => setDeletingId(s._id)}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ================= DELETE CONFIRM MODAL ================= */}
      {deletingId && deletingId !== "loading" && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Delete Service?</h3>
            <p style={styles.modalText}>
              This action cannot be undone.
            </p>

            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setDeletingId(null)}
              >
                Cancel
              </button>

              <button
                style={styles.confirmBtn}
                onClick={() => handleDelete(deletingId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyServices;

/* =====================================================
                    STYLES
===================================================== */
const styles = {
  page: {
    padding: "30px",
    background: "#f4f7fb",
    minHeight: "100vh",
    fontFamily: "Inter, system-ui, sans-serif",
  },

  title: {
    fontSize: "28px",
    fontWeight: "800",
    marginBottom: "25px",
    color: "#111827",
  },

  empty: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: "16px",
  },

  /* GRID */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "25px",
  },

  /* CARD */
  card: {
    background: "#fff",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
    transition: "transform .3s, box-shadow .3s",
  },

  image: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
  },

  cardBody: {
    padding: "18px",
  },

  cardTitle: {
    fontSize: "18px",
    fontWeight: "700",
    marginBottom: "8px",
    color: "#111",
  },

  price: {
    display: "inline-block",
    background: "linear-gradient(90deg,#00c2ff,#008aff)",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "14px",
    marginBottom: "10px",
  },

  desc: {
    fontSize: "14px",
    color: "#555",
    margin: "12px 0",
    lineHeight: "1.5",
  },

  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "15px",
  },

  editBtn: {
    flex: 1,
    padding: "10px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  deleteBtn: {
    flex: 1,
    padding: "10px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  /* MODAL */
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },

  modal: {
    background: "#fff",
    padding: "25px",
    borderRadius: "14px",
    width: "320px",
    textAlign: "center",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },

  modalTitle: {
    fontSize: "20px",
    fontWeight: "700",
    marginBottom: "10px",
  },

  modalText: {
    fontSize: "14px",
    color: "#555",
    marginBottom: "20px",
  },

  modalActions: {
    display: "flex",
    gap: "12px",
  },

  cancelBtn: {
    flex: 1,
    padding: "10px",
    background: "#e5e7eb",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  confirmBtn: {
    flex: 1,
    padding: "10px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
};
