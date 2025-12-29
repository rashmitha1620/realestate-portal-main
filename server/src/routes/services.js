const express = require("express");
const multer = require("multer");
const Service = require("../models/Service");
const ServiceProvider = require("../models/ServiceProvider");
const { auth } = require("../middleware/auth");

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/service-images"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const imagesUpload = multer({ storage: imageStorage });

const router = express.Router();

// Public: list services (with simple query)
router.get("/", async (req, res) => {
  const { page = 1, limit = 20, q } = req.query;
  const query = { active: true };
  if (q) query.$text = { $search: q };
  const skip = (page - 1) * limit;
  const items = await Service.find(query).populate("provider", "name email serviceTypes").sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
  res.json(items);
});

// Get single service
router.get("/:id", async (req, res) => {
  const s = await Service.findById(req.params.id).populate("provider", "name email");
  if (!s) return res.status(404).json({ error: "Not found" });
  res.json(s);
});

// Create service - provider or admin or agent
router.post("/", auth, imagesUpload.array("images", 8), async (req, res) => {
  try {
    // only active provider / admin / agent can create
    if (!(req.user.role === "serviceProvider" || req.user.isAdmin || req.user.isAgent)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // if provider, ensure subscription active
    if (req.user.role === "serviceProvider") {
      const sp = await ServiceProvider.findById(req.user.id);
      if (!sp || !sp.subscription?.active) return res.status(403).json({ error: "Subscription required" });
    }

    const data = { ...req.body };
    data.images = (req.files || []).map(f => f.path);
    if (req.user.role === "serviceProvider") data.provider = req.user.id;
    if (req.user.isAgent) data.createdByAgent = req.user.id;
    const s = new Service(data);
    await s.save();
    res.status(201).json({ message: "Uploaded", service: s });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed create" });
  }
});

// Update service - only provider who created it or admin can edit
router.put("/:id", auth, imagesUpload.array("images", 8), async (req, res) => {
  try {
    const s = await Service.findById(req.params.id);
    if (!s) return res.status(404).json({ error: "Not found" });

    // check permissions
    const isProviderOwner = req.user.role === "serviceProvider" && s.provider.toString() === req.user.id.toString();
    if (!isProviderOwner && !req.user.isAdmin) return res.status(403).json({ error: "Unauthorized" });

    // append images if provided
    if (req.files && req.files.length) s.images = s.images.concat(req.files.map(f => f.path));
    // allow other fields via body
    const allowed = ["title","description","price","location","active"];
    allowed.forEach(k => { if (req.body[k] !== undefined) s[k] = req.body[k]; });

    await s.save();
    res.json({ message: "Updated", service: s });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

// Delete (soft delete) - provider owner or admin
router.delete("/:id", auth, async (req, res) => {
  try {
    const s = await Service.findById(req.params.id);
    if (!s) return res.status(404).json({ error: "Not found" });
    const isProviderOwner = req.user.role === "serviceProvider" && s.provider.toString() === req.user.id.toString();
    if (!isProviderOwner && !req.user.isAdmin) return res.status(403).json({ error: "Unauthorized" });
    s.active = false;
    await s.save();
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
