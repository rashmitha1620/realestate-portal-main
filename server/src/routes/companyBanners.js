const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const CompanyBanner = require("../models/CompanyBanner");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

/* ================= MULTER ================= */
const uploadDir = "uploads/company-banners";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Helper function to safely parse JSON
const safeJsonParse = (str, defaultValue = []) => {
  if (!str || str.trim() === "") return defaultValue;
  try {
    return JSON.parse(str);
  } catch (err) {
    console.error("JSON parse error:", err);
    return defaultValue;
  }
};

/* ================= CREATE ================= */
router.post("/", adminAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image required" });
    }

    const data = {
      companyName: req.body.companyName,
      serviceCategory: req.body.serviceCategory || "",
      services: safeJsonParse(req.body.services),
      listingTypes: safeJsonParse(req.body.listingTypes),
      propertyTypes: safeJsonParse(req.body.propertyTypes),
      operatingCities: req.body.operatingCities || "",
      phone: req.body.phone || "",
      website: req.body.website || "",
      tagline: req.body.tagline || "", // If you added this field
      description: req.body.description || "", // If you added this field
      priority: Number(req.body.priority || 10),
      // Use 'active' field (from model), handle both 'active' and 'isActive' from frontend
      active: req.body.active === "false" || req.body.isActive === "false" ? false : true,
      image: `/uploads/company-banners/${req.file.filename}`,
    };

    const banner = await CompanyBanner.create(data);
    res.json({ success: true, banner });
  } catch (err) {
    console.error("Create error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= READ ================= */
router.get("/", async (req, res) => {
  try {
    // Get query parameters for filtering
    const { serviceCategory, listingType, propertyType, city } = req.query;
    let query = { active: true };
    
    // Apply filters if provided
    if (serviceCategory) query.serviceCategory = serviceCategory;
    if (listingType) query.listingTypes = listingType;
    if (propertyType) query.propertyTypes = propertyType;
    if (city) query.operatingCities = new RegExp(city, 'i');
    
    const banners = await CompanyBanner.find(query).sort({ priority: 1 });
    res.json(banners);
  } catch (err) {
    console.error("Read error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= READ ALL (FOR ADMIN) ================= */
router.get("/admin/all", adminAuth, async (req, res) => {
  try {
    const banners = await CompanyBanner.find().sort({ priority: 1 });
    res.json(banners);
  } catch (err) {
    console.error("Admin read error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= SINGLE ================= */
router.get("/:id", async (req, res) => {
  try {
    const banner = await CompanyBanner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: "Not found" });
    res.json(banner);
  } catch (err) {
    console.error("Single read error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= UPDATE ================= */
router.put("/:id", adminAuth, upload.single("image"), async (req, res) => {
  try {
    const banner = await CompanyBanner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: "Not found" });

    // Update image if new one uploaded
    if (req.file) {
      banner.image = `/uploads/company-banners/${req.file.filename}`;
    }

    // Update fields
    banner.companyName = req.body.companyName || banner.companyName;
    banner.serviceCategory = req.body.serviceCategory || banner.serviceCategory;
    banner.services = safeJsonParse(req.body.services, banner.services);
    banner.listingTypes = safeJsonParse(req.body.listingTypes, banner.listingTypes);
    banner.propertyTypes = safeJsonParse(req.body.propertyTypes, banner.propertyTypes);
    banner.operatingCities = req.body.operatingCities || banner.operatingCities;
    banner.phone = req.body.phone || banner.phone;
    banner.website = req.body.website || banner.website;
    banner.tagline = req.body.tagline || banner.tagline;
    banner.description = req.body.description || banner.description;
    banner.priority = Number(req.body.priority || banner.priority);
    banner.active = req.body.active === "false" || req.body.isActive === "false" ? false : true;

    await banner.save();
    res.json({ success: true, banner });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= TOGGLE ACTIVE STATUS ================= */
router.patch("/:id", adminAuth, async (req, res) => {
  try {
    const banner = await CompanyBanner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: "Not found" });
    
    banner.active = !banner.active;
    await banner.save();
    
    res.json({ success: true, active: banner.active });
  } catch (err) {
    console.error("Toggle status error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= DELETE ================= */
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    await CompanyBanner.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;