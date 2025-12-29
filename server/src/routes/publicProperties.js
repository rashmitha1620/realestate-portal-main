// server/src/routes/publicProperties.js
const express = require("express");
const Property = require("../models/Property");
const Agent = require("../models/Agent");

const router = express.Router();

/* ============================
   HELPER
============================ */
function isSubscriptionValid(subscription) {
  return (
    subscription &&
    subscription.active === true &&
    subscription.expiresAt &&
    new Date(subscription.expiresAt) > new Date()
  );
}

/* ============================
   GET ALL ACTIVE PROPERTIES (PUBLIC)
============================ */
router.get("/", async (req, res) => {
  try {
    const props = await Property.find({ active: true })
      .populate("agent", "name subscription")
      .populate("owner", "name")
      .sort({ createdAt: -1 });

    const filtered = props.filter(p => {
      if (!p.agent) return true; // admin posted
      return isSubscriptionValid(p.agent.subscription);
    });

    // 🔒 HIDE PHONE / EMAIL
    const safe = filtered.map(p => {
      const obj = p.toObject();

      if (obj.agent) {
        if (!isSubscriptionValid(obj.agent.subscription)) {
          delete obj.agent;
        } else {
          delete obj.agent.subscription;
        }
      }

      return obj;
    });

    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: "Failed to load properties" });
  }
});

/* ============================
   GET SINGLE PROPERTY (PUBLIC)
============================ */
router.get("/:id", async (req, res) => {
  try {
    const p = await Property.findOne({
      _id: req.params.id,
      active: true,
    }).populate("agent", "name phone email subscription");

    if (!p) return res.status(404).json({ error: "Not found" });

    // ❌ BLOCK IF AGENT SUB EXPIRED
    if (p.agent && !isSubscriptionValid(p.agent.subscription)) {
      return res.status(403).json({
        code: "AGENT_SUB_EXPIRED",
        message: "Agent subscription expired",
      });
    }

    // 🔒 HIDE CONTACT
    const obj = p.toObject();
    if (obj.agent) {
      delete obj.agent.subscription;
    }

    res.json(obj);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

module.exports = router;
