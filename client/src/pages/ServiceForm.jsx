import React, { useState } from "react";
import { ServiceProviderAPI } from "../api/apiService";
import { useNavigate } from "react-router-dom";

export default function ServiceForm() {
  const nav = useNavigate();

  const stored = JSON.parse(localStorage.getItem("editService") || "null");

  // ============================
  //   FIXED DEFAULT STATE
  // ============================
  const [form, setForm] = useState(
    stored
      ? {
          title: stored.title || "",
          description: stored.description || "",
          price: stored.price || "",
          city: stored.city || "",
          customCity: "",
          location: {
            address: stored.location?.address || "",
          },
        }
      : {
          title: "",
          description: "",
          price: "",
          city: "",
          customCity: "",
          location: { address: "" },
        }
  );

  const [images, setImages] = useState([]);
  const [msg, setMsg] = useState("");

  // ============================
  //   SUBMIT HANDLER
  // ============================
const handleSubmit = async (e) => {
  e.preventDefault();

  const finalCity =
    form.city === "Other" ? form.customCity.trim() : form.city.trim();

  if (!finalCity) {
    setMsg("Please select or enter a valid city");
    return;
  }

  const fd = new FormData();
  fd.append("title", form.title);
  fd.append("description", form.description);
  fd.append("price", form.price);
  fd.append("city", finalCity);
  fd.append("address", form.location.address);

  images.forEach((img) => fd.append("images", img));

  try {
    if (stored) {
      // Update service
      await ServiceProviderAPI.updateService(stored._id, fd);
      setMsg("Service updated successfully!");
    } else {
      // Create new service
      await ServiceProviderAPI.uploadService(fd);
      setMsg("Service created successfully!");
    }

    localStorage.removeItem("editService");

// Reset form
setForm({
  title: "",
  description: "",
  price: "",
  city: "",
  customCity: "",
  location: { address: "" },
});
setImages([]);

// 🔥 Redirect to My Services page (this route actually exists)
setTimeout(() => {
  window.location.href = "/service-provider/my-services";
}, 500);
  } catch (err) {
    console.error("❌ Upload failed:", err);
    setMsg("Upload failed");
  }
};

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>
        {stored ? "Edit Service" : "Create New Service"}
      </h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* SERVICE TITLE */}
        <label style={styles.label}>Service Title</label>
        <input
          value={form.title}
          placeholder="e.g., Painting Service, Home Cleaning"
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          style={styles.input}
          required
        />

        {/* DESCRIPTION */}
        <label style={styles.label}>Description</label>
        <textarea
          value={form.description}
          placeholder="Describe your service…"
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
          style={styles.textarea}
        />

        {/* PRICE */}
        <label style={styles.label}>Price (₹)</label>
        <input
          type="number"
          value={form.price}
          placeholder="Enter price"
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          style={styles.input}
        />

        {/* CITY */}
        <label style={styles.label}>City</label>
        <select
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          style={styles.select}
          required
        >
          <option value="">Select City</option>
          <option value="Hyderabad">Hyderabad</option>
          <option value="Bangalore">Bangalore</option>
          <option value="Chennai">Chennai</option>
          <option value="Tirupati">Tirupati</option>
          <option value="Kurnool">Kurnool</option>
          <option value="Kadapa">Kadapa</option>
          <option value="Nellore">Nellore</option>
          <option value="Other">Other</option>
        </select>

        {/* CUSTOM CITY */}
        {form.city === "Other" && (
          <>
            <label style={styles.label}>Enter City / Town / Village</label>
            <input
              value={form.customCity}
              placeholder="Piler, Madanapalle, Rajampet…"
              onChange={(e) =>
                setForm({ ...form, customCity: e.target.value })
              }
              style={styles.input}
              required
            />
          </>
        )}

        {/* ADDRESS */}
        <label style={styles.label}>Full Address</label>
        <input
          value={form.location.address}
          placeholder="House No, Street, Near Landmark…"
          onChange={(e) =>
            setForm({
              ...form,
              location: { ...form.location, address: e.target.value },
            })
          }
          style={styles.input}
        />

        {/* IMAGES */}
        <label style={styles.label}>Upload Images</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setImages([...e.target.files])}
          style={styles.fileInput}
        />

        {images.length > 0 && (
          <div style={styles.previewRow}>
            {images.map((img, i) => (
              <img
                key={i}
                src={URL.createObjectURL(img)}
                alt="Preview"
                style={styles.previewImg}
              />
            ))}
          </div>
        )}

        <button type="submit" style={styles.submitBtn}>
          {stored ? "Update Service" : "Create Service"}
        </button>
      </form>

      {msg && <p style={styles.msg}>{msg}</p>}
    </div>
  );
}

/* ---------------------- STYLES ---------------------- */
const styles = {
  container: {
    maxWidth: 650,
    margin: "auto",
    padding: 25,
    background: "#ffffff",
    borderRadius: 14,
    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 20,
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  label: { fontWeight: "600", marginBottom: 4 },
  input: {
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #ccc",
    outline: "none",
    fontSize: 15,
  },
  textarea: {
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #bbb",
    outline: "none",
    height: 120,
    resize: "vertical",
  },
  select: {
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #ccc",
    outline: "none",
    fontSize: 15,
    background: "#fff",
  },
  fileInput: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
  },
  previewRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  previewImg: {
    width: 90,
    height: 90,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid #ddd",
  },
  submitBtn: {
    marginTop: 10,
    padding: "12px 16px",
    background: "#d32f2f",
    color: "#fff",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
  },
  msg: {
    marginTop: 14,
    textAlign: "center",
    fontWeight: 600,
  },
};
