const express = require("express");
const router = express.Router();

const Enquiry = require("../models/Enquiry");              
const ServiceEnquiry = require("../models/ServiceEnquiry"); 

const Property = require("../models/Property");
const Service = require("../models/Service");

const { sendMail } = require("../utils/sendMail");

const { enquiryEmailTemplate } = require("../utils/emailTemplates"); // ✅ ADD
//const { sendPropertyEnquiryEmail } = require("../utils/emailTemplates");
const { auth } = require("../middleware/auth");

const {
  sendPropertyEnquiryEmail,
} = require("../utils/emailTemplates");

/* ============================================================================
   1️⃣ PUBLIC — SUBMIT PROPERTY ENQUIRY
============================================================================ */
router.post("/", async (req, res) => {
  try {
    const { propertyId, name, email, phone, message } = req.body;

    const property = await Property.findById(propertyId)
      .populate("agent", "name email phone")
      .populate("owner", "name email");

    if (!property)
      return res.status(404).json({ error: "Property not found" });

    const enquiry = new Enquiry({
      property: property._id,
      agent: property.agent?._id,
      name,
      email,
      phone,
      message,
      type: "property",
      status: "new",
    });

    await enquiry.save();

    /* ✅ SEND EMAIL USING NEW FUNCTION */
    const receiver = property.agent || property.owner;

    if (receiver?.email) {
      await sendPropertyEnquiryEmail({
        to: receiver.email,
        propertyTitle: property.title,
        propertyType: property.propertyType || property.type,
        propertyPrice: property.price,
        propertyLocation: property.location || property.areaName,
        propertyId: property.propertyId || property._id,
        name,
        email,
        phone,
        message,
        agentName: receiver.name,
        agentPhone: receiver.phone
      });
      
      console.log(`✅ Property enquiry email sent to ${receiver.email}`);
    } else {
      console.warn("⚠ Property enquiry: receiver email missing");
    }

    res.json({ 
      success: true, 
      enquiry,
      message: "Enquiry submitted successfully" 
    });
  } catch (err) {
    console.error("PROPERTY ENQUIRY ERROR:", err);
    res.status(500).json({ error: "Failed to submit property enquiry" });
  }
});
/* ============================================================================
   1️⃣B PUBLIC — SUBMIT SERVICE ENQUIRY
============================================================================ */
router.post("/service", async (req, res) => {
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

    /* ✅ SEND EMAIL USING TEMPLATE */
    if (service.provider?.email) {
      await sendMail({
        to: service.provider.email,
        subject: `New Service Enquiry – ${service.title}`,
        html: enquiryEmailTemplate({
          logoUrl: "https://img.icons8.com/ios-filled/200/fa314a/home.png", // ✅ REQUIRED
          enquiryType: "Service Enquiry",
          title: service.title,
          name,
          email: null,
          phone,
          message,
        }),
      });
    } else {
      console.warn("⚠ Service enquiry: provider email missing");
    }

    res.json({ success: true, enquiry });
  } catch (err) {
    console.error("SERVICE ENQUIRY ERROR:", err);
    res.status(500).json({ error: "Failed to submit service enquiry" });
  }
});

/* ============================================================================
   2️⃣ ADMIN — GET ALL ENQUIRIES
============================================================================ */
router.get("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Admin access only" });

    const propertyEnquiries = await Enquiry.find()
      .populate("property", "title price areaName images")
      .populate("agent", "name email phone")
      .sort({ createdAt: -1 });

    const serviceEnquiries = await ServiceEnquiry.find()
      .populate("service", "title price images")
      .populate("provider", "name email phone")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      propertyEnquiries,
      serviceEnquiries,
    });
  } catch (err) {
    console.error("ADMIN ENQUIRIES ERROR:", err);
    res.status(500).json({ error: "Failed to load admin enquiries" });
  }
});

/* ============================================================================
   3️⃣ ROLE BASED — MY ENQUIRIES
============================================================================ */
router.get("/my-enquiries", auth, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const propertyEnquiries = await Enquiry.find()
        .populate("property", "title price areaName images")
        .populate("agent", "name email phone")
        .sort({ createdAt: -1 });

      const serviceEnquiries = await ServiceEnquiry.find()
        .populate("service", "title price images")
        .populate("provider", "name email phone")
        .sort({ createdAt: -1 });

      return res.json({
        success: true,
        propertyEnquiries,
        serviceEnquiries,
      });
    }

    if (req.user.role === "agent") {
      const propertyEnquiries = await Enquiry.find({ agent: req.user.id })
        .populate("property", "title price areaName images")
        .sort({ createdAt: -1 });

      return res.json({
        success: true,
        propertyEnquiries,
        serviceEnquiries: [],
      });
    }

    if (req.user.role === "service") {
      const serviceEnquiries = await ServiceEnquiry.find({
        provider: req.user.id,
      })
        .populate("service", "title price images")
        .sort({ createdAt: -1 });

      return res.json({
        success: true,
        propertyEnquiries: [],
        serviceEnquiries,
      });
    }

    res.status(403).json({ error: "Unauthorized" });
  } catch (err) {
    console.error("MY ENQUIRIES ERROR:", err);
    res.status(500).json({ error: "Failed to load enquiries" });
  }
});

router.get("/admin/agent-enquiries", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    const list = await Enquiry.find()
      .populate("agent", "name email")
      .populate("property", "title price")
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (err) {
    console.error("ADMIN AGENT ENQUIRIES ERROR:", err);
    res.status(500).json({ error: "Failed to load enquiries" });
  }
});

module.exports = router;
