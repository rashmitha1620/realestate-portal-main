// server/src/routes/publicServices.js
const express = require("express");
const Service = require("../models/Service");
const ServiceProvider = require("../models/ServiceProvider");

const router = express.Router();

function isValid(sub) {
  return sub && sub.active && sub.expiresAt > new Date();
}

/* PUBLIC SERVICES */
router.get("/", async (req, res) => {
  const list = await Service.find()
    .populate("provider", "name subscription");

  const filtered = list.filter(s =>
    isValid(s.provider?.subscription)
  );

  const safe = filtered.map(s => {
    const o = s.toObject();
    delete o.provider.subscription;
    return o;
  });

  res.json(safe);
});

/* SINGLE SERVICE */
router.get("/:id", async (req, res) => {
  const s = await Service.findById(req.params.id)
    .populate("provider", "name email phone subscription");

  if (!s) return res.status(404).json({ error: "Not found" });

  if (!isValid(s.provider.subscription)) {
    return res.status(403).json({
      code: "SUB_EXPIRED",
      message: "Service provider subscription expired",
    });
  }

  const obj = s.toObject();
  delete obj.provider.subscription;
  res.json(obj);
});

module.exports = router;
