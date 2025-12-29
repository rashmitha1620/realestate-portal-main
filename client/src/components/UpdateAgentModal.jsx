import React, { useState, useEffect } from "react";
import api from "../api/api";

export default function UpdateAgentModal({ open, agent, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    commissionPercent: "",
  });

  useEffect(() => {
    if (agent) {
      setForm({
        name: agent.name || "",
        email: agent.email || "",
        phone: agent.phone || "",
        password: "",
        commissionPercent: agent.commissionPercent || "",
      });
    }
  }, [agent]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {};

    if (form.name !== agent.name) payload.name = form.name;
    if (form.phone !== agent.phone) payload.phone = form.phone;
    if (form.commissionPercent !== agent.commissionPercent)
      payload.commissionPercent = Number(form.commissionPercent);
    if (form.password.trim() !== "")
      payload.password = form.password;

    if (Object.keys(payload).length === 0) {
      alert("No changes to update.");
      return;
    }

    try {
      // ⭐ Correct API URL
      const res = await api.put(`/admin/agents/${agent._id}`, payload);

      if (onSaved) onSaved(res.data);
      onClose();
    } catch (err) {
      console.error("Update agent failed:", err.response?.data || err);
      alert(err.response?.data?.error || "Update failed");
    }
  };

  return (
    <div style={backdrop}>
      <div style={modal}>
        <h3>Update Agent</h3>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label>
            Name
            <input name="name" value={form.name} onChange={handleChange} style={input} />
          </label>

          <label>
            Email (cannot edit)
            <input value={form.email} disabled style={{ ...input, background: "#eee" }} />
          </label>

          <label>
            Phone
            <input name="phone" value={form.phone} onChange={handleChange} style={input} />
          </label>

          <label>
            New Password (optional)
            <input
              name="password"
              type="password"
              placeholder="Leave empty to keep same"
              value={form.password}
              onChange={handleChange}
              style={input}
            />
          </label>

          <label>
            Commission %
            <input
              name="commissionPercent"
              type="number"
              value={form.commissionPercent}
              onChange={handleChange}
              style={input}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={onClose} style={cancelBtn}>
              Cancel
            </button>
            <button type="submit" style={saveBtn}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modal = {
  width: 400,
  padding: 20,
  background: "#fff",
  borderRadius: 10,
};

const input = {
  width: "100%",
  padding: 8,
  marginTop: 5,
  borderRadius: 5,
  border: "1px solid #ccc",
};

const cancelBtn = {
  padding: "8px 14px",
  background: "#ccc",
  border: "none",
  borderRadius: 5,
};

const saveBtn = {
  padding: "8px 14px",
  background: "#007bff",
  color: "#fff",
  border: "none",
  borderRadius: 5,
};
