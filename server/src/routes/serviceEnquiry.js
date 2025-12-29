const express = require("express");
const router = express.Router();

const ServiceEnquiry = require("../models/ServiceEnquiry");
const Service = require("../models/Service");
const ServiceProvider = require("../models/ServiceProvider");
const sendMail = require("../utils/sendMail"); // ✅ ADD
const { auth } = require("../middleware/auth");

/* ===========================================================
   1️⃣ PUBLIC — Submit enquiry for a service
   =========================================================== */
router.post("/", async (req, res) => {
  try {
    const { serviceId, name, phone, message } = req.body;

    const service = await Service.findById(serviceId)
      .populate("provider", "name email");

    if (!service)
      return res.status(404).json({ error: "Service not found" });

    const enquiry = new ServiceEnquiry({
      service: service._id,
      provider: service.provider?._id,
      name,
      phone,
      message,
    });

    await enquiry.save();

    /* ✅ SEND EMAIL TO SERVICE PROVIDER */
    if (service.provider?.email) {
      await sendMail({
        to: service.provider.email,
        subject: `New Service Enquiry – ${service.title}`,
        html: `
          <h3>New Service Enquiry</h3>
          <p><b>Service:</b> ${service.title}</p>
          <p><b>Name:</b> ${name}</p>
          <p><b>Phone:</b> ${phone}</p>
          <p><b>Message:</b> ${message || "—"}</p>
        `,
      });
    } else {
      console.warn("⚠ Service enquiry: provider email missing");
    }

    res.json({ success: true, enquiryId: enquiry._id });

  } catch (err) {
    console.error("SERVICE ENQUIRY ERROR:", err);
    res.status(500).json({ error: "Failed to submit enquiry" });
  }
});

/* ===========================================================
   2️⃣ PROVIDER — View enquiries for the provider’s services
   =========================================================== */
router.get("/my-enquiries", auth, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "service") {
      if (!req.user.id)
        return res.status(400).json({ error: "Provider ID missing" });
      filter.provider = req.user.id;
    }
    else if (req.user.role === "admin") {
      filter = {};
    }
    else {
      return res.status(403).json({ error: "Access denied" });
    }

    const enquiries = await ServiceEnquiry.find(filter)
      .populate("service", "title price images")
      .sort({ createdAt: -1 });

    res.json(enquiries);

  } catch (err) {
    console.error("MY SERVICE ENQUIRIES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ===========================================================
   3️⃣ ADMIN — View ALL service enquiries
   =========================================================== */
router.get("/admin", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied" });

    const all = await ServiceEnquiry.find()
      .populate("service", "title price images")
      .populate("provider", "name email phone serviceCategory")
      .sort({ createdAt: -1 });

    res.json(all);

  } catch (err) {
    console.error("ADMIN SERVICE ENQUIRIES ERROR:", err);
    res.status(500).json({ error: "Failed to load service enquiries" });
  }
});

module.exports = router;
