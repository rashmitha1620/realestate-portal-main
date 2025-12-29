import React, { useState } from "react";
import api from "../api/api";

export default function EnquiryForm({ propertyId }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [msg, setMsg] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      const res = await api.post(`/properties/${propertyId}/enquiry`, form);
      setMsg(res.data.message || "✅ Enquiry sent!");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      setMsg(
        "❌ Failed to send enquiry: " +
          (err.response?.data?.error || "Server error")
      );
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Enquiry Form</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          name="name"
          placeholder="Your Name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Your Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          name="phone"
          placeholder="Your Phone Number"
          value={form.phone}
          onChange={handleChange}
          required
        />
        <textarea
          name="message"
          placeholder="Message (optional)"
          value={form.message}
          onChange={handleChange}
          rows={3}
        />
        <button type="submit">Send Enquiry</button>
      </form>
      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
