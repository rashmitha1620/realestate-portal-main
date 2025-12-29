// server/src/routes/admin.js

const express = require("express");
const router = express.Router();

const Property = require("../models/Property");
const Agent = require("../models/Agent");
const Enquiry = require("../models/Enquiry");
const ServiceProvider = require("../models/ServiceProvider");   // ✅ FIXED (critical)

const { auth } = require("../middleware/auth");

/* ===========================================================
   🏠 1️⃣ ADMIN SUMMARY
=========================================================== */
router.get("/summary", auth, async (req, res, next) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Access denied" });

    const [totalAgents, totalProps, totalEnquiries] = await Promise.all([
      Agent.countDocuments(),
      Property.countDocuments(),
      Enquiry.countDocuments(),
    ]);

    res.json({
      message: "Admin summary loaded",
      summary: {
        totalAgents,
        totalProperties: totalProps,
        totalEnquiries,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ===========================================================
   🧱 2️⃣ VIEW ALL PROPERTIES
=========================================================== */
router.get("/properties", auth, async (req, res, next) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Access denied" });

    const props = await Property.find({})
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    res.json(props);
  } catch (err) {
    next(err);
  }
});

/* ===========================================================
   👥 3️⃣ MANAGE AGENTS
=========================================================== */

// ✅ GET ALL AGENTS
router.get("/agents", auth, async (req, res, next) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Access denied" });

    const agents = await Agent.find({}, "-password").sort({ createdAt: -1 });
    res.json(agents);
  } catch (err) {
    next(err);
  }
});

// ➕ ADD AGENT
router.post("/agents", auth, async (req, res, next) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Access denied" });

    const { name, email, phone, password } = req.body;

    const existing = await Agent.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Agent already exists" });

    const agentId = "AGT-" + Math.floor(1000 + Math.random() * 9000);

    const agent = new Agent({ agentId, name, email, phone, password });
    await agent.save();

    res.status(201).json({ message: "Agent added successfully", agent });
  } catch (err) {
    next(err);
  }
});

// 🔄 UPDATE AGENT
router.put("/agents/:id", auth, async (req, res, next) => {
  if (!req.user.isAdmin)
      return res.status(403).json({ error: "Access denied" });

  const agent = await Agent.findById(req.params.id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  Object.assign(agent, req.body);
  await agent.save();

  res.json({ message: "Agent updated successfully", agent });
});

// ❌ DELETE AGENT
router.delete("/agents/:id", auth, async (req, res, next) => {
  if (!req.user.isAdmin)
      return res.status(403).json({ error: "Access denied" });

  await Agent.findByIdAndDelete(req.params.id);
  res.json({ message: "Agent deleted successfully" });
});
/* ===========================================================
   ✉️ 4️⃣ VIEW ALL ENQUIRIES
=========================================================== */
router.get("/enquiries", auth, async (req, res, next) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Access denied" });

    const all = await Enquiry.find({})
      .populate("property", "title price areaName")
      .populate("agent", "name email")
      .sort({ createdAt: -1 });

    res.json(all);
  } catch (err) {
    next(err);
  }
});

/* ===========================================================
   ⭐ 5️⃣ ADMIN — SEE ALL REFERRED SERVICE PROVIDERS
=========================================================== */
router.get("/referrals", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admins only" });
    }

    const providers = await ServiceProvider.find({
      referralAgent: { $exists: true },
    })
      .populate("referralAgent", "name email")
      .select("name email serviceCategory status createdAt referralAgent");

    res.json(providers);
  } catch (err) {
    console.error("Admin referral fetch error:", err);
    res.status(500).json({ error: "Could not load referrals" });
  }
});

module.exports = router;
