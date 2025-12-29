// client/src/pages/PropertyForm.jsx
import React, { useState, useEffect } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function PropertyForm() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "DTCP",
    propertyType: "Open Plot",
     city: "",  
    areaName: "",
    price: "",
    location: "",
    nearbyHighway: "",
     listingType: "Sell",
  });

  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [video, setVideo] = useState(null);
  const [message, setMessage] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const nav = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = storedUser?.isAdmin === true;

  // Check subscription
  useEffect(() => {
    async function checkSubscription() {
      try {
        if (isAdmin) {
          setSubscribed(true);
          setLoading(false);
          return;
        }
        const res = await api.get("/auth/me");
        setSubscribed(res.data.subscription?.active || false);
      } catch (err) {
        setSubscribed(false);
      } finally {
        setLoading(false);
      }
    }
    checkSubscription();
  }, []);

  // Preview images
  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setImagePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const combined = [...images, ...files].slice(0, 8);
    setImages(combined);
  };

  const removeImage = (i) =>
    setImages((prev) => prev.filter((_, index) => index !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAdmin && !subscribed) {
      setMessage("❌ Please subscribe to post properties.");
      return;
    }

    const fd = new FormData();

    Object.keys(form).forEach((k) => fd.append(k, form[k]));
    images.forEach((img) => fd.append("images", img));
    if (video) fd.append("video", video);

    try {
      const res = await api.post("/properties", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("✅ Property posted successfully!");
      setTimeout(() => nav("/"), 1200);
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.error || "Failed to post"));
    }
  };

  if (loading) return <p>Loading...</p>;

  if (!isAdmin && !subscribed) {
    return (
      <div className="locked-card">
        <h2>🔒 Property Upload Locked</h2>
        <p>Subscribe to unlock property posting.</p>
      </div>
    );
  }

  return (
    <div className="property-form-container">
      <h2>🏠 Post a Property</h2>

      <form onSubmit={handleSubmit} className="property-form-grid">
        <input
          name="title"
          placeholder="Property Title"
          value={form.title}
          onChange={handleChange}
          required
        />

        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
          >
            <option value="DTCP">DTCP</option>
            <option value="HMDA">HMDA</option>
            <option value="Other">Other</option>
          </select>

          <select
            name="propertyType"
            value={form.propertyType}
            onChange={handleChange}
          >
            <option value="Open Plot">Open Plot</option>
            <option value="Apartment">Apartment</option>
            <option value="Villa">Villa</option>
            <option value="Independent House">Independent House</option>
            <option value="Farmland">Farmland</option>
          </select>
          <select
  name="listingType"
  value={form.listingType}
  onChange={handleChange}
>
  <option value="Sell">For Sale</option>
  <option value="Rent">For Rent</option>
  <option value="Lease">For Lease</option>
  <option value="PG">PG / Hostel</option>
  <option value="Farm Lease">Farm Lease</option>
   <option value="Others">Others</option>
</select>
        </div>
        <input
  name="city"
  placeholder="City"
  value={form.city}
  onChange={handleChange}
  required
/>

        <input
          name="areaName"
          placeholder="Area / Village"
          value={form.areaName}
          onChange={handleChange}
        />

        <input
          name="price"
          placeholder="Price (₹)"
          type="number"
          value={form.price}
          onChange={handleChange}
          required
        />

        {/* Removed Google Map Input */}
        <input
          name="location"
          placeholder="Manual location (City / Village / Landmark)"
          value={form.location}
          onChange={handleChange}
        />

        <input
          name="nearbyHighway"
          placeholder="Nearby highway / landmark"
          value={form.nearbyHighway}
          onChange={handleChange}
        />

        {/* Images */}
        <label className="file-input">
          Upload Images (max 8)
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
          />
        </label>

        <div className="image-preview-row">
          {imagePreviews.map((src, i) => (
            <div key={i} className="image-preview">
              <img src={src} alt="preview" />
              <button type="button" onClick={() => removeImage(i)}>
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Video */}
        <label className="file-input">
          Upload Video (optional)
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideo(e.target.files[0])}
          />
        </label>

        <button type="submit" className="submit-btn">
          🚀 Submit Property
        </button>
      </form>

      <p className="result-msg">{message}</p>
    </div>
  );
}
