import React, { useEffect, useState } from "react";
import { ServiceProviderAPI } from "../api/apiService";

export default function AdminServiceProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editProvider, setEditProvider] = useState(null);
  const [deleteProvider, setDeleteProvider] = useState(null);

  const [msg, setMsg] = useState("");

  // Load all service providers
  const loadProviders = async () => {
    try {
      const res = await ServiceProviderAPI.getAll();
      setProviders(res.data || []);
    } catch (err) {
      console.error(err);
      setMsg("Failed to load providers");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProviders();
  }, []);

  /* ================================
     UPDATE HANDLER
  ================================== */
  const handleUpdate = async () => {
    try {
      const { _id, name, phone, serviceTypes } = editProvider;
      const res = await ServiceProviderAPI.update(_id, {
        name,
        phone,
        serviceTypes,
      });

      setMsg("Updated successfully");
      setEditProvider(null);
      loadProviders();
    } catch (err) {
      console.error(err);
      setMsg("Update failed");
    }
  };

  /* ================================
     DELETE HANDLER
  ================================== */
  const handleDelete = async () => {
    try {
      await ServiceProviderAPI.delete(deleteProvider._id);
      setMsg("Provider deleted");
      setDeleteProvider(null);
      loadProviders();
    } catch (err) {
      console.error(err);
      setMsg("Delete failed");
    }
  };

  return (
    <div style={{ padding: 25 }}>
      <h2>🛠 Manage Service Providers</h2>

      {msg && <p style={{ color: "green" }}>{msg}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : providers.length === 0 ? (
        <p>No service providers found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Services</th>
                <th>Referred By</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {providers.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td>{p.phone}</td>
                  <td>{p.email}</td>
                  <td>{(p.serviceTypes || []).join(", ")}</td>
                  <td>{p.referredByAgentName || "—"}</td>

                  <td>
                    <button
                      style={btnEdit}
                      onClick={() => setEditProvider({ ...p })}
                    >
                      Edit
                    </button>
                    <button
                      style={btnDelete}
                      onClick={() => setDeleteProvider(p)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =============================
          UPDATE MODAL
          ============================= */}
      {editProvider && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <h3>Edit Provider</h3>

            <label>Name</label>
            <input
              style={input}
              value={editProvider.name}
              onChange={(e) =>
                setEditProvider({ ...editProvider, name: e.target.value })
              }
            />

            <label>Phone</label>
            <input
              style={input}
              value={editProvider.phone}
              onChange={(e) =>
                setEditProvider({ ...editProvider, phone: e.target.value })
              }
            />

            <label>Service Types (comma separated)</label>
            <input
              style={input}
              value={editProvider.serviceTypes.join(", ")}
              onChange={(e) =>
                setEditProvider({
                  ...editProvider,
                  serviceTypes: e.target.value
                    .split(",")
                    .map((s) => s.trim()),
                })
              }
            />

            <div style={modalActions}>
              <button onClick={() => setEditProvider(null)} style={modalCancel}>
                Cancel
              </button>
              <button onClick={handleUpdate} style={modalSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================
          DELETE CONFIRMATION
          ============================= */}
      {deleteProvider && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <h3>Delete Provider?</h3>
            <p>
              Are you sure you want to delete{" "}
              <strong>{deleteProvider.name}</strong>?
            </p>

            <div style={modalActions}>
              <button
                onClick={() => setDeleteProvider(null)}
                style={modalCancel}
              >
                Cancel
              </button>
              <button onClick={handleDelete} style={modalDeleteBtn}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================
    Styles
============================= */

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
  marginTop: 20,
};

const btnEdit = {
  background: "#3498db",
  color: "#fff",
  padding: "6px 10px",
  marginRight: 6,
  border: "none",
  borderRadius: 5,
  cursor: "pointer",
};

const btnDelete = {
  background: "#e74c3c",
  color: "#fff",
  padding: "6px 10px",
  border: "none",
  borderRadius: 5,
  cursor: "pointer",
};

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalBox = {
  background: "#fff",
  padding: 20,
  borderRadius: 8,
  width: 350,
};

const input = {
  width: "100%",
  padding: 8,
  margin: "6px 0 12px",
  borderRadius: 5,
  border: "1px solid #ccc",
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 10,
};

const modalCancel = {
  padding: "6px 12px",
  background: "#aaa",
  border: "none",
  borderRadius: 5,
};

const modalSave = {
  padding: "6px 12px",
  background: "#007bff",
  color: "#fff",
  border: "none",
  borderRadius: 5,
};
const modalDeleteBtn = {
  padding: "6px 12px",
  background: "#e74c3c",
  color: "#fff",
  border: "none",
  borderRadius: 5,
};
