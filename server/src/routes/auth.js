// server/src/routes/auth.js

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();

const Agent = require("../models/Agent");
const ServiceProvider = require("../models/ServiceProvider");
const MarketingExecutive = require("../models/MarketingExecutive");

/* ==========================================================
   🔑 HELPER — SUBSCRIPTION CHECK
========================================================== */
function isSubscriptionValid(subscription) {
  if (!subscription) return false;
  if (!subscription.active) return false;
  if (!subscription.expiresAt) return false;
  return new Date(subscription.expiresAt) > new Date();
}

/* ==========================================================
   1️⃣ AGENT LOGIN (SOFT SUBSCRIPTION BLOCK)
========================================================== */
router.post("/agent-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const agent = await Agent.findOne({ email });
    if (!agent) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, agent.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const subscriptionValid = isSubscriptionValid(agent.subscription);

    const token = jwt.sign(
      { id: agent._id, role: "agent" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        agentId: agent.agentId,

        subscription: agent.subscription || { active: false },
        subscriptionValid,

        // ⭐ FRONTEND REDIRECT FLAG
        mustRenewSubscription: !subscriptionValid,

        isAgent: true,
        isAdmin: false,
        isService: false,
        isMarketing: false,
      },
    });
  } catch (err) {
    console.error("Agent login error:", err);
    res.status(500).json({ error: "Server error during agent login" });
  }
});

/* ==========================================================
   2️⃣ SERVICE PROVIDER LOGIN (SOFT SUBSCRIPTION BLOCK)
========================================================== */
router.post("/service-provider-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const sp = await ServiceProvider.findOne({ email });
    if (!sp) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, sp.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const subscriptionValid = isSubscriptionValid(sp.subscription);

    const token = jwt.sign(
      { id: sp._id, role: "service" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        _id: sp._id,
        name: sp.name,
        email: sp.email,

        subscription: sp.subscription || { active: false },
        subscriptionValid,

        // ⭐ FRONTEND REDIRECT FLAG
        mustRenewSubscription: !subscriptionValid,

        isService: true,
        isAgent: false,
        isAdmin: false,
        isMarketing: false,
      },
    });
  } catch (err) {
    console.error("Service provider login error:", err);
    res.status(500).json({ error: "Server error during provider login" });
  }
});

/* ==========================================================
   3️⃣ ADMIN LOGIN (NO SUBSCRIPTION)
========================================================== */
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      email !== process.env.ADMIN_EMAIL ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(400).json({ error: "Invalid admin credentials" });
    }

    const token = jwt.sign(
      { id: "admin", role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        _id: "admin",
        name: "Portal Admin",
        email: process.env.ADMIN_EMAIL,

        isAdmin: true,
        isAgent: false,
        isService: false,
        isMarketing: false,
      },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Error logging in admin" });
  }
});

/* ==========================================================
   4️⃣ MARKETING EXECUTIVE LOGIN (NO SUBSCRIPTION)
========================================================== */
router.post("/marketing-executive/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const exec = await MarketingExecutive.findOne({ email });
    if (!exec) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, exec.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      {
        id: exec._id,
        role: "marketingExecutive",
        meid: exec.meid,
        email: exec.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token, exec });
  } catch (err) {
    console.error("ME login error:", err);
    res.status(500).json({ error: "Server error during ME login" });
  }
});

/* ==========================================================
   UNIVERSAL /me (WITH SUBSCRIPTION STATUS)
========================================================== */
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /* ----- ADMIN ----- */
    if (decoded.role === "admin") {
      return res.json({
        _id: "admin",
        name: "Portal Admin",
        email: process.env.ADMIN_EMAIL,
        isAdmin: true,
        isAgent: false,
        isService: false,
        isMarketing: false,
        subscriptionValid: true,
      });
    }

    /* ----- AGENT ----- */
    if (decoded.role === "agent") {
      const agent = await Agent.findById(decoded.id).select("-password");
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      return res.json({
        ...agent.toObject(),
        subscriptionValid: isSubscriptionValid(agent.subscription),
        mustRenewSubscription: !isSubscriptionValid(agent.subscription),
        isAdmin: false,
        isAgent: true,
        isService: false,
        isMarketing: false,
      });
    }

    /* ----- SERVICE PROVIDER ----- */
    if (decoded.role === "service") {
      const sp = await ServiceProvider.findById(decoded.id).select("-password");
      if (!sp) return res.status(404).json({ error: "Service provider not found" });

      return res.json({
        ...sp.toObject(),
        subscriptionValid: isSubscriptionValid(sp.subscription),
        mustRenewSubscription: !isSubscriptionValid(sp.subscription),
        isAdmin: false,
        isAgent: false,
        isService: true,
        isMarketing: false,
      });
    }

    /* ----- MARKETING EXECUTIVE ----- */
    if (decoded.role === "marketingExecutive") {
      const exec = await MarketingExecutive.findById(decoded.id).select("-password");
      if (!exec) return res.status(404).json({ error: "Marketing Executive not found" });

      return res.json({
        ...exec.toObject(),
        isAdmin: false,
        isAgent: false,
        isService: false,
        isMarketing: true,
      });
    }

    return res.status(401).json({ error: "Unknown role type" });
  } catch (err) {
    console.error("Auth me error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
