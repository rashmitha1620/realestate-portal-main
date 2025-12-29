// server/src/routes/adminAgents.js
const express = require("express");
const bcrypt = require("bcryptjs");
const Agent = require("../models/Agent");
const { auth } = require("../middleware/auth");

const router = express.Router();

/* -----------------------------------------------------
   Middleware: Only allow Admin
----------------------------------------------------- */
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

/* -----------------------------------------------------
   GET ALL AGENTS (Admin)
----------------------------------------------------- */
router.get("/", auth, requireAdmin, async (req, res) => {
  try {
    const agents = await Agent.find().select("-password").sort({ createdAt: -1 });
    res.json(agents);
  } catch (err) {
    console.error("List agents error:", err);
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

/* -----------------------------------------------------
   GET AGENT BY ID
----------------------------------------------------- */
router.get("/:id", auth, requireAdmin, async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id).select("-password");
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    res.json(agent);
  } catch (err) {
    console.error("Fetch agent error:", err);
    res.status(500).json({ error: "Failed to fetch agent" });
  }
});

/* -----------------------------------------------------
   UPDATE AGENT (Admin)
----------------------------------------------------- */
router.put("/:id", auth, requireAdmin, async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const allowed = [
      "name",
      "email",
      "phone",
      "commissionPercent",
      "profession",
      "bankDetails",
      "password",
    ];

    // Email uniqueness check
    if (req.body.email && req.body.email !== agent.email) {
      const exists = await Agent.findOne({ email: req.body.email });
      if (exists) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    // Assign normal fields
    for (let key of allowed) {
      if (key !== "password" && req.body[key] !== undefined) {
        agent[key] = req.body[key];
      }
    }

    // Password hashing
    if (req.body.password) {
      agent.password = await bcrypt.hash(req.body.password, 10);
    }

    await agent.save();

    const safe = agent.toObject();
    delete safe.password;

    res.json({ message: "Agent updated", agent: safe });
  } catch (err) {
    console.error("Update agent error:", err);
    res.status(500).json({ error: "Failed to update agent" });
  }
});

/* -----------------------------------------------------
   DELETE AGENT (Soft delete)
----------------------------------------------------- */
router.delete("/:id", auth, requireAdmin, async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    agent.active = false; // soft delete
    await agent.save();

    res.json({ message: "Agent deactivated", id: agent._id });
  } catch (err) {
    console.error("Delete agent error:", err);
    res.status(500).json({ error: "Failed to delete agent" });
  }
});

module.exports = router;
