import React, { useState } from "react";
import api from "../../api/api";

export default function AdminCompanyBanner() {
  const [companyName, setCompanyName] = useState("");
  const [priority, setPriority] = useState(1);
  const [image, setImage] = useState(null);

  // ✅ new states
  const [services, setServices] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [listingTypes, setListingTypes] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [cities, setCities] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  const [msg, setMsg] = useState("");

  const toggleValue = (val, list, setter) => {
    if (list.includes(val)) {
      setter(list.filter((x) => x !== val));
    } else {
      setter([...list, val]);
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("companyName", companyName);
    fd.append("priority", priority);
    fd.append("image", image);

    // ✅ additional fields
    fd.append(
      "services",
      JSON.stringify(services.split(",").map((s) => s.trim()))
    );
    fd.append("serviceCategory", serviceCategory);
    fd.append("listingTypes", JSON.stringify(listingTypes));
    fd.append("propertyTypes", JSON.stringify(propertyTypes));
    fd.append("operatingCities", cities);
    fd.append("phone", phone);
    fd.append("website", website);

    try {
      await api.post("/company-banners", fd);
      setMsg("✅ Company banner & services uploaded successfully");

      // reset
      setCompanyName("");
      setPriority(1);
      setImage(null);
      setServices("");
      setServiceCategory("");
      setListingTypes([]);
      setPropertyTypes([]);
      setCities("");
      setPhone("");
      setWebsite("");
    } catch (err) {
      console.error(err);
      setMsg("❌ Upload failed");
    }
  };

  return (
    <div className="admin-card">
      <h2>🏢 Company Banner & Services</h2>

      <form onSubmit={submit} className="admin-form">
        {/* Company Name */}
        <input
          placeholder="Company Name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />

        {/* Priority */}
        <input
          placeholder="Priority (1 = Top)"
          type="number"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        />

        {/* Services */}
        <input
          placeholder="Services (comma separated)"
          value={services}
          onChange={(e) => setServices(e.target.value)}
        />

        {/* Service Category */}
        <select
          value={serviceCategory}
          onChange={(e) => setServiceCategory(e.target.value)}
        >
          <option value="">Select Service Category</option>
          <option value="Real Estate Agency">Real Estate Agency</option>
          <option value="Builder & Developer">Builder & Developer</option>
          <option value="Legal & Documentation">Legal & Documentation</option>
          <option value="Interior & Construction">Interior & Construction</option>
          <option value="Loan & Finance">Loan & Finance</option>
        </select>

        {/* Listing Types */}
        <div className="checkbox-group">
          <label>Listing Types:</label>
          {["Sell", "Rent", "Lease", "PG", "Farm Lease"].map((l) => (
            <label key={l}>
              <input
                type="checkbox"
                checked={listingTypes.includes(l)}
                onChange={() =>
                  toggleValue(l, listingTypes, setListingTypes)
                }
              />
              {l}
            </label>
          ))}
        </div>

        {/* Property Types */}
        <div className="checkbox-group">
          <label>Property Types:</label>
          {[
            "Apartment",
            "Villa",
            "Open Plot",
            "Commercial",
            "Farmland",
          ].map((p) => (
            <label key={p}>
              <input
                type="checkbox"
                checked={propertyTypes.includes(p)}
                onChange={() =>
                  toggleValue(p, propertyTypes, setPropertyTypes)
                }
              />
              {p}
            </label>
          ))}
        </div>

        {/* Cities */}
        <input
          placeholder="Operating Cities (comma separated)"
          value={cities}
          onChange={(e) => setCities(e.target.value)}
        />

        {/* Contact */}
        <input
          placeholder="Contact Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          placeholder="Website (optional)"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />

        {/* Image */}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
          required
        />

        <button type="submit">🚀 Upload Company</button>
      </form>

      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}
