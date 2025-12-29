const express = require("express");
const Service = require("../models/Service");
const ServiceProvider = require("../models/ServiceProvider");
const ServiceEnquiry = require("../models/ServiceEnquiry");
const sendMail = require("../utils/sendMail"); // ✅ ADD THIS
const { enquiryEmailTemplate } = require("../utils/emailTemplates");
const route = express.Router();

/* ===========================================================
   PUBLIC — Contact Service Provider
   POST /:serviceId/contact
   =========================================================== */
route.post("/:serviceId/contact", async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { name, email, phone, message } = req.body;

    const service = await Service.findById(serviceId)
      .populate("provider", "name email");

    if (!service)
      return res.status(404).json({ error: "Service not found" });

    const enquiry = new ServiceEnquiry({
      service: service._id,
      provider: service.provider?._id,
      name,
      email,
      phone,
      message,
    });

    await enquiry.save();

    /* ✅ SEND EMAIL TO SERVICE PROVIDER */
    if (service.provider?.email) {
      await sendMail({
  to: service.provider.email,
  subject: `New Enquiry – ${service.title}`,
  html: enquiryEmailTemplate({
    logoUrl: "https://yourdomain.com/logo.png",
    enquiryType: "Service Enquiry",
    title: service.title,
    name,
    email,
    phone,
    message,
  }),
});

    } else {
      console.warn("⚠ Service contact: provider email missing");
    }

    /* ✅ OPTIONAL: CC ADMIN */
    if (process.env.MAIL_EMAIL) {
      await sendMail({
        to: process.env.MAIL_EMAIL,
        subject: `Admin Copy – Service Enquiry (${service.title})`,
        html: `
          <p><b>Service:</b> ${service.title}</p>
          <p><b>Provider:</b> ${service.provider?.name}</p>
          <p><b>Name:</b> ${name}</p>
          <p><b>Phone:</b> ${phone}</p>
        `,
      });
    }

    res.json({ success: true, message: "Enquiry submitted" });

  } catch (err) {
    console.error("SERVICE CONTACT ERROR:", err);
    res.status(500).json({ error: "Failed to submit enquiry" });
  }
});

module.exports = route;
