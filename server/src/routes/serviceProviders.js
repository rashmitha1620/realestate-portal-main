// server/src/routes/serviceProviders.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const ServiceProvider = require("../models/ServiceProvider");
const Service = require("../models/Service");
const ServiceEnquiry = require("../models/ServiceEnquiry");
const { auth } = require("../middleware/auth");

const router = express.Router();
const nodemailer = require("nodemailer");
const { sendWelcomeEmail } = require("../utils/emailTemplates");
const { sendServiceEnquiryEmail } = require("../utils/emailTemplates");
const Transaction = require("../models/Transaction");

/* =============================================================================
   🔑 SUBSCRIPTION HELPER
============================================================================= */
function isSubscriptionValid(subscription) {
  if (!subscription) return false;
  if (!subscription.active) return false;
  if (!subscription.expiresAt) return false;
  return new Date(subscription.expiresAt) > new Date();
}

// Optional: Helper for days calculation
function getSubscriptionStatus(subscription) {
  if (!subscription || !subscription.expiresAt) {
    return { valid: false, daysRemaining: 0, expired: true };
  }
  
  const now = new Date();
  const expiresAt = new Date(subscription.expiresAt);
  const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
  
  return {
    valid: subscription.active && daysRemaining > 0,
    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
    expired: daysRemaining <= 0
  };
}

async function sendMail({ to, subject, html }) {
  try {
    console.log("📧 Attempting to send email to:", to);
    
    // Check environment variables
if (!process.env.MAIL_EMAIL || !process.env.MAIL_APP_PASSWORD) {

      console.error("❌ Email credentials missing in .env file");
      console.log("   EMAIL_USER:", process.env.EMAIL_USER ? "Set" : "NOT SET");
      console.log("   EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "Set" : "NOT SET");
      throw new Error("Email service not configured");
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
  user: process.env.MAIL_EMAIL,
  pass: process.env.MAIL_APP_PASSWORD,
},

    });

    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Real Estate Portal" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
      text: html.replace(/<[^>]*>/g, ""), // Strip HTML tags for plain text version
    });

    console.log("✅ Email sent successfully:", info.messageId);
    return info;
    
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    console.error("   Error code:", error.code);
    throw error;
  }
}
/* =============================================================================
   📁 Ensure folders exist
============================================================================= */
const DOCS_DIR = "uploads/service-docs";
const IMG_DIR = "uploads/service-images";
const TEMP_DIR = "uploads/tempProviders";

[DOCS_DIR, IMG_DIR, TEMP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* =============================================================================
   📤 Multer for documents
============================================================================= */
const docsStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, DOCS_DIR),
  filename: (_, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        crypto.randomBytes(6).toString("hex") +
        path.extname(file.originalname)
    );
  },
});
const uploadDocs = multer({ storage: docsStorage });

/* =============================================================================
   📤 Multer for service images
============================================================================= */
const imgStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, IMG_DIR),
  filename: (_, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        crypto.randomBytes(6).toString("hex") +
        path.extname(file.originalname)
    );
  },
});
const uploadImages = multer({ storage: imgStorage });

/* =============================================================================
   🧹 Helper — Delete old images
============================================================================= */
function safeDelete(fileUrl) {
  try {
    if (!fileUrl) return;

    // Extract path after domain
    const url = new URL(fileUrl);
    const relativePath = url.pathname.replace(/^\//, "");

    const abs = path.join(process.cwd(), relativePath);

    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs);
    }
  } catch (err) {
    console.warn("safeDelete skipped:", err.message);
  }
}


/* =============================================================================
   ⭐ 1) GET ALL SERVICES (PUBLIC — FILTER EXPIRED PROVIDERS)
============================================================================= */
// Public services listing
router.get("/", async (req, res) => {
  const services = await Service.find()
    .populate("provider", "name email phone serviceCategory subscription");

  const visible = services.filter(
    s => s.provider && isSubscriptionValid(s.provider.subscription)
  );

  res.json(visible);
});


/* =============================================================================
   ⭐ 2) ALL PROVIDERS (PUBLIC — FILTER EXPIRED)
============================================================================= */
router.get("/all-providers", async (req, res) => {
  try {
    const list = await ServiceProvider.find()
      .select("name email phone serviceCategory createdAt subscription");

    // Filter out providers with expired subscriptions
    const activeProviders = list.filter(provider => 
      isSubscriptionValid(provider.subscription)
    );

    res.json(activeProviders);
  } catch (err) {
    console.error("ALL PROVIDERS ERROR:", err);
    res.status(500).json({ error: "Failed to load providers" });
  }
});

/* =============================================================================
   ⭐ 3) CREATE ORDER (Docs Upload)
============================================================================= */
router.post(
  "/payments/create-order",
  uploadDocs.fields([
    { name: "aadhar", maxCount: 1 },
    { name: "voter", maxCount: 1 },
    { name: "pan", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        name, email, phone, password,
        serviceCategory,
        selectedServices,
        referralAgentId,
        referralMarketingExecutiveName,
        referralMarketingExecutiveId
      } = req.body;

      if (!req.files?.aadhar || !req.files?.voter)
        return res.status(400).json({ error: "Aadhar and Voter ID are required" });

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const tempId = crypto.randomBytes(12).toString("hex");

      const data = {
        tempId,
        provider: {
          name,
          email,
          phone,
          password,
          serviceCategory,
          selectedServices: selectedServices ? JSON.parse(selectedServices) : [],
          referralAgentId: referralAgentId || null,
          referralMarketingExecutiveName,
          referralMarketingExecutiveId,
        },
        files: {
          aadhar: `${baseUrl}/${DOCS_DIR}/${req.files.aadhar[0].filename}`,
          voter: `${baseUrl}/${DOCS_DIR}/${req.files.voter[0].filename}`,
          pan: req.files.pan
            ? `${baseUrl}/${DOCS_DIR}/${req.files.pan[0].filename}`
            : null,
        },
      };

      fs.writeFileSync(
        path.join(TEMP_DIR, `${tempId}.json`),
        JSON.stringify(data, null, 2)
      );

      res.json({ success: true, tempId });

    } catch (err) {
      console.error("ORDER CREATE ERROR:", err);
      res.status(500).json({ error: "Order creation failed" });
    }
  }
);

/* =============================================================================
   ⭐ 4) VERIFY PAYMENT -> CREATE ACCOUNT
============================================================================= */
router.post("/payments/verify", async (req, res) => {
  try {
    const { tempId } = req.body;

    const tempFile = path.join(TEMP_DIR, `${tempId}.json`);
    if (!fs.existsSync(tempFile))
      return res.status(400).json({ error: "Temp data missing" });

    const temp = JSON.parse(fs.readFileSync(tempFile));

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(temp.provider.password, 10);

    // 🧑 Create provider with subscription expiry
    const paidAt = new Date();
    const expiresAt = new Date(paidAt);
    expiresAt.setMonth(expiresAt.getMonth() + 1); // Add 1 month
    
    const provider = new ServiceProvider({
      name: temp.provider.name,
      email: temp.provider.email,
      phone: temp.provider.phone,
      password: hashedPassword,
      serviceCategory: temp.provider.serviceCategory,
      serviceTypes: temp.provider.selectedServices,
      referralAgent: temp.provider.referralAgentId,
      referralMarketingExecutiveName:
        temp.provider.referralMarketingExecutiveName || null,
      referralMarketingExecutiveId:
        temp.provider.referralMarketingExecutiveId || null,
      documents: temp.files,
      status: "active",
      subscription: {
        active: true,
        lastPaidAt: paidAt,
        expiresAt: expiresAt,
        amount: 1500,
        currency: "INR",
        paymentGateway: "cashfree",
      },
    });

    // 💾 Save provider
    await provider.save();
    console.log("✅ Provider saved with ID:", provider._id);

    // 📧 SEND WELCOME EMAIL
    let emailSent = false;
    let emailError = null;
    
    try {
      console.log("📧 Sending welcome email to:", provider.email);
      
      // Call the sendWelcomeEmail function
      const emailResult = await sendWelcomeEmail({
        to: provider.email,
        name: provider.name,
        role: "service-provider",
      });
      
      console.log("✅ Email sending result:", emailResult);
      emailSent = true;
      console.log("✅ Welcome email sent successfully to:", provider.email);
      
    } catch (mailErr) {
      emailError = mailErr.message;
      console.error("❌ Welcome email failed:");
      console.error("Error Message:", mailErr.message);
      console.error("Error Stack:", mailErr.stack);
      
      // Don't fail the whole process if email fails
      console.log("⚠️ Continuing registration despite email failure");
    }

    // 🧹 Cleanup temp file
    try {
      fs.unlinkSync(tempFile);
      console.log("✅ Temp file cleaned up:", tempFile);
    } catch (cleanupErr) {
      console.error("⚠️ Temp file cleanup failed:", cleanupErr.message);
    }

    // 📤 Response
    res.json({
      success: true,
      providerId: provider._id,
      email: provider.email,
      subscription: {
        active: true,
        expiresAt: expiresAt,
        lastPaidAt: paidAt,
      },
      emailSent,
      emailError: emailError || undefined,
      message: emailSent 
        ? "Registration successful! Welcome email sent."
        : "Registration successful! Welcome email failed but account created."
    });

  } catch (err) {
    console.error("❌ VERIFY ERROR:");
    console.error("Error Message:", err.message);
    console.error("Error Stack:", err.stack);
    res.status(500).json({ 
      error: "Verification failed",
      details: err.message 
    });
  }
});

/* =============================================================================
   ⭐ 5) LOGIN
============================================================================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Find service provider
    const provider = await ServiceProvider.findOne({ 
      email: email.trim().toLowerCase() 
    });
    
    if (!provider) {
      return res.status(400).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Password check
    const isPasswordValid = await bcrypt.compare(password, provider.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Ensure subscription exists (same as agent logic)
    if (!provider.subscription || Object.keys(provider.subscription).length === 0) {
      provider.subscription = {
        active: false,
        expiresAt: null,
        lastPaidAt: null,
        paymentGateway: null,
        amount: 5000,
        currency: "INR",
        needsRenewal: true,
        planType: "basic"
      };
      await provider.save();
    }

    // Check subscription validity
    const subscriptionValid = isSubscriptionValid(provider.subscription);
    const subStatus = getSubscriptionStatus(provider.subscription);
    
    // Block login if subscription invalid
    if (!subscriptionValid) {
      return res.status(403).json({
        success: false,
        error: "SUBSCRIPTION_EXPIRED",
        message: "Your subscription has expired or is inactive",
        data: {
          userId: provider._id,
          email: provider.email,
          name: provider.name,
          businessName: provider.businessName,
          serviceProviderId: provider.serviceProviderId,
          userType: "service-provider",
          subscription: provider.subscription,
          expiresAt: provider.subscription.expiresAt,
          daysExpired: subStatus.expired ? Math.abs(subStatus.daysRemaining) : 0,
          redirectTo: "/renewal"
        }
      });
    }

    // Generate JWT token - Use "service" role (matches your auth middleware)
    const token = jwt.sign(
      {
        id: provider._id,
        role: "service", // Your auth middleware accepts both "service" and "service-provider"
        email: provider.email,
        name: provider.name,
        subscription: provider.subscription,
        subscriptionValid: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Prepare response data
    const providerData = provider.toObject();
    delete providerData.password;
    
    // Add subscription info
    providerData.subscriptionActive = true;
    providerData.daysRemaining = subStatus.daysRemaining;

    // Success response
    return res.status(200).json({
      success: true,
      token,
      provider: providerData,
      subscription: provider.subscription,
      subscriptionValid: true,
      subscriptionActive: true,
      daysRemaining: subStatus.daysRemaining,
    });

  } catch (error) {
    console.error("❌ SERVICE PROVIDER LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      error: "Login failed. Please try again later.",
    });
  }
});

/* =============================================================================
   ⭐ 6) MY PROFILE
============================================================================= */
router.get("/me", auth, async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.user.id).select(
      "-password"
    );
    
    // Add subscription status
    const providerData = provider.toObject();
    providerData.subscriptionValid = isSubscriptionValid(provider.subscription);
    
    res.json(providerData);
  } catch (err) {
    res.status(500).json({ error: "Failed to load profile" });
  }
});

/* =============================================================================
   ⭐ 7) CREATE SERVICE (WITH SUBSCRIPTION CHECK)
============================================================================= */
router.post("/service", auth, uploadImages.array("images", 10), async (req, res) => {
  try {
    if (req.user.role !== "service")
      return res.status(403).json({ error: "Unauthorized" });

    // Check subscription
    if (!isSubscriptionValid(req.user.subscription)) {
      return res.status(403).json({
        error: "Subscription expired. Please renew to add services",
        renewRequired: true,
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

const images = req.files.map(
  (f) => `${baseUrl}/${IMG_DIR}/${f.filename}`
);


    const service = new Service({
      provider: req.user.id,
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      images,

      // ⭐ NEW CITY FIELD
      city: req.body.city,
      
      location: {
        address: req.body.address,
        lat: req.body.lat,
        lng: req.body.lng,
      },
      subscriptionValid: true, // Flag indicating service was posted with valid subscription
    });

    await service.save();

    res.json({ success: true, service });

  } catch (err) {
    console.error("SERVICE CREATE ERROR:", err);
    res.status(500).json({ error: "Service upload failed" });
  }
});

/* =============================================================================
   ⭐ 8) UPDATE SERVICE (WITH SUBSCRIPTION CHECK) - FIXED VERSION
============================================================================= */
router.put("/service/:id", auth, uploadImages.array("images", 10), async (req, res) => {
  try {
    console.log("🔄 UPDATE SERVICE REQUEST =========");
    console.log("Service ID:", req.params.id);
    
    // ✅ FIX: Check if req.user exists
    if (!req.user) {
      console.log("❌ ERROR: req.user is undefined!");
      return res.status(401).json({ 
        error: "Authentication required",
        details: "User not authenticated"
      });
    }
    
    console.log("User ID:", req.user.id);
    console.log("User role:", req.user.role);
    console.log("Full req.user:", req.user);

    // Check user role - accept both "service" and "service-provider"
    const validRoles = ["service", "service-provider"];
    if (!validRoles.includes(req.user.role)) {
      console.log("❌ User not a service provider, role is:", req.user.role);
      return res.status(403).json({ 
        error: "Unauthorized",
        details: `Invalid role: ${req.user.role}`
      });
    }

    // ✅ FIX: Load fresh subscription data from database
    console.log("🔍 Loading provider subscription...");
    const provider = await ServiceProvider.findById(req.user.id).select("subscription");
    
    if (!provider) {
      console.log("❌ Provider not found in database");
      return res.status(404).json({ error: "Service provider not found" });
    }

    console.log("📊 Subscription from DB:", provider.subscription);
    
    // Check subscription using fresh data
    const subscriptionValid = isSubscriptionValid(provider.subscription);
    console.log("✅ Subscription valid?", subscriptionValid);
    
    if (!subscriptionValid) {
      console.log("❌ Subscription expired or invalid");
      return res.status(403).json({
        error: "Subscription expired. Please renew to update service",
        renewRequired: true,
        subscription: provider.subscription
      });
    }

    // Find the service
    const service = await Service.findById(req.params.id);
    if (!service) {
      console.log("❌ Service not found");
      return res.status(404).json({ error: "Service Not Found" });
    }

    // Check ownership
    console.log("👤 Checking ownership...");
    console.log("Service provider ID:", service.provider.toString());
    console.log("User ID:", req.user.id);
    
    const isOwner = service.provider.toString() === req.user.id;
    console.log("✅ Is owner?", isOwner);
    
    if (!isOwner) {
      console.log("❌ Not the owner of this service");
      return res.status(403).json({ error: "You do not own this service" });
    }

    // Update fields
    console.log("📝 Updating service fields...");
    console.log("City from request:", req.body.city);
    console.log("Current city:", service.city);
    
    // Keep old city if not sent
    service.city = req.body.city || service.city;

    // Update basic fields
    service.title = req.body.title || service.title;
    service.description = req.body.description || service.description;
    service.price = req.body.price || service.price;

    // Update address if provided
    if (req.body.address) service.location.address = req.body.address;
    if (req.body.lat) service.location.lat = req.body.lat;
    if (req.body.lng) service.location.lng = req.body.lng;

    // Handle new images
    if (req.files && req.files.length > 0) {
      console.log("🖼️ Adding new images:", req.files.length);
      const newImages = req.files.map((f) => `/${IMG_DIR}/${f.filename}`);
      service.images.push(...newImages);
    }

    // Update subscription validity flag
    service.subscriptionValid = subscriptionValid;

    // Save the service
    console.log("💾 Saving service...");
    await service.save();
    console.log("✅ Service updated successfully");

    res.json({ 
      success: true, 
      service: {
        _id: service._id,
        title: service.title,
        description: service.description,
        price: service.price,
        city: service.city,
        images: service.images,
        location: service.location,
        subscriptionValid: service.subscriptionValid
      }
    });

  } catch (err) {
    console.error("❌ SERVICE UPDATE ERROR:", err);
    console.error("Error details:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Request params:", req.params);
    console.error("Request body keys:", Object.keys(req.body));
    console.error("Request files:", req.files ? req.files.length : 0);
    console.error("req.user exists?", !!req.user);
    
    // Specific error for undefined req.user
    if (err.message.includes("Cannot read properties of undefined")) {
      return res.status(401).json({ 
        error: "Authentication failed",
        details: "User not properly authenticated. Please log in again."
      });
    }
    
    res.status(500).json({ 
      error: "Service update failed",
      details: err.message 
    });
  }
});
/* =============================================================================
   ⭐ 9) DELETE SERVICE (WITH SUBSCRIPTION CHECK)
============================================================================= */
router.delete("/service/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "service")
      return res.status(403).json({ error: "Unauthorized" });

    // Check subscription
    if (!isSubscriptionValid(req.user.subscription)) {
      return res.status(403).json({
        error: "Subscription expired. Please renew to delete service",
        renewRequired: true,
      });
    }

    const s = await Service.findById(req.params.id);
    if (!s) return res.status(404).json({ error: "Service not found" });

    s.images.forEach(safeDelete);
    await s.deleteOne();

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

/* =============================================================================
   ⭐ 10) MY SERVICES (ALWAYS SHOW TO PROVIDER)
============================================================================= */
router.get("/my-services", auth, async (req, res) => {
  try {
    const list = await Service.find({ provider: req.user.id });
    
    // Add subscription status to each service for frontend
    const enhancedList = list.map(service => {
      const serviceObj = service.toObject();
      serviceObj.subscriptionValid = isSubscriptionValid(req.user.subscription);
      return serviceObj;
    });
    
    res.json(enhancedList);
  } catch (err) {
    res.status(500).json({ error: "Failed to load" });
  }
});

/* =============================================================================
   ⭐ 11) ADMIN — LIST PROVIDERS
============================================================================= */
router.get("/admin/list", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    const list = await ServiceProvider.find().select("-password");

    res.json(list);

  } catch (err) {
    console.error("ADMIN LIST PROVIDERS ERROR:", err);
    res.status(500).json({ error: "Failed to load providers" });
  }
});

/* =============================================================================
   ⭐ 12) SERVICE ENQUIRIES
============================================================================= */
router.post("/service/enquiry", async (req, res) => {
  try {
    const { serviceId, name, phone, message } = req.body;

    const s = await Service.findById(serviceId).populate("provider");
    if (!s) return res.status(404).json({ error: "Service not found" });

    // Check if provider subscription is valid
    if (s.provider && !isSubscriptionValid(s.provider.subscription)) {
      return res.status(403).json({ 
        error: "This service provider's subscription has expired. Please contact support.",
        subscriptionExpired: true
      });
    }

    const enquiry = new ServiceEnquiry({
      service: s._id,
      provider: s.provider._id,
      name,
      phone,
      message,
    });

    await enquiry.save();

    // ✅ SEND EMAIL TO SERVICE PROVIDER (OR ADMIN)
    await sendServiceEnquiryEmail({
      to: s.provider.email,
      title: s.title,
      name,
      phone,
      message,
    });

    res.json({ success: true });

  } catch (err) {
    console.error("SERVICE ENQUIRY ERROR:", err);
    res.status(500).json({ error: "Failed to submit enquiry" });
  }
});

/* =============================================================================
   ⭐ 13) PROVIDER'S ENQUIRIES
============================================================================= */
router.get("/my-service-enquiries", auth, async (req, res) => {
  try {
    let filter = {};

    // ✅ FIX: support BOTH old & new role names
    if (req.user.role === "service" || req.user.role === "service-provider") {
      filter.provider = req.user.id;
    }
    else if (req.user.role === "admin") {
      filter = {};
    }
    else {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const list = await ServiceEnquiry.find(filter)
      .populate("service", "title price images")
      .sort({ createdAt: -1 });

    res.json(list);

  } catch (err) {
    console.error("MY SERVICE ENQUIRIES ERROR:", err);
    res.status(500).json({ error: "Failed to load enquiries" });
  }
});


/* =============================================================================
   ⭐ 14) GET PROVIDER BY ID (PUBLIC — CHECK SUBSCRIPTION)
============================================================================= */
router.get("/:id", async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id).select(
      "-password"
    );

    if (!provider)
      return res.status(404).json({ error: "Provider not found" });

    // Check subscription
    const subscriptionValid = isSubscriptionValid(provider.subscription);
    if (!subscriptionValid) {
      return res.status(403).json({
        error: "This provider's subscription has expired. Services are not available.",
        subscriptionExpired: true,
        providerId: provider._id
      });
    }

    const providerData = provider.toObject();
    providerData.subscriptionValid = subscriptionValid;
    
    res.json(providerData);
  } catch (err) {
    res.status(500).json({ error: "Error fetching provider" });
  }
});

/* =============================================================================
   ⭐ 15) GET ALL SERVICES FOR A PROVIDER (PUBLIC — FILTER EXPIRED)
============================================================================= */
router.get("/:id/services", async (req, res) => {
  try {
    const providerId = req.params.id;

    // Check if provider exists and has valid subscription
    const provider = await ServiceProvider.findById(providerId)
      .select("subscription name email");
    
    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    // Check subscription
    if (!isSubscriptionValid(provider.subscription)) {
      return res.status(403).json({
        error: "This provider's subscription has expired. Services are not available.",
        subscriptionExpired: true
      });
    }

    const services = await Service.find({ provider: providerId })
      .select("title price description images city createdAt subscriptionValid");

    res.json(services);

  } catch (err) {
    console.error("GET PROVIDER SERVICES ERROR:", err);
    res.status(500).json({ error: "Failed to load services" });
  }
});

/* =============================================================================
   ⭐ 16) GET SINGLE SERVICE DETAILS (PUBLIC — CHECK SUBSCRIPTION)
============================================================================= */
router.get("/service/:id", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate("provider", "name email phone serviceCategory subscription");
    
    if (!service)
      return res.status(404).json({ message: "Service Not Found" });

    // Check provider subscription
    if (service.provider && !isSubscriptionValid(service.provider.subscription)) {
      return res.status(403).json({ 
        message: "This service is currently unavailable. The provider's subscription has expired.",
        subscriptionExpired: true,
        serviceId: service._id,
        providerId: service.provider._id
      });
    }

    res.json(service);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

/* =============================================================================
   ⭐ 17) DASHBOARD (ALWAYS ACCESSIBLE FOR RENEWAL)
============================================================================= */
router.get("/dashboard", auth, async (req, res) => {
  try {
    // Must be service provider
    if (req.user.role !== "service")
      return res.status(403).json({ message: "Unauthorized" });

    // Load provider
    const provider = await ServiceProvider.findById(req.user.id);
    if (!provider)
      return res.status(404).json({ message: "Provider not found" });

    // Check subscription status
    const subscriptionValid = isSubscriptionValid(provider.subscription);
    const now = new Date();
    const expiresAt = provider.subscription?.expiresAt ? new Date(provider.subscription.expiresAt) : null;
    
    let daysRemaining = null;
    if (expiresAt && expiresAt > now) {
      daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    }

    // Load provider services (always show in dashboard)
    const services = await Service.find({ provider: req.user.id }).sort({
      createdAt: -1,
    });

    // Load enquiries for provider services
    const enquiries = await ServiceEnquiry.find({
      service: { $in: services.map((s) => s._id) },
    }).sort({ createdAt: -1 });

    res.json({
      provider,
      services,
      enquiries,
      subscription: {
        valid: subscriptionValid,
        expiresAt: expiresAt,
        daysRemaining: daysRemaining,
        lastPaidAt: provider.subscription?.lastPaidAt,
        amount: provider.subscription?.amount || 1500,
        currency: provider.subscription?.currency || "INR",
        needsRenewal: !subscriptionValid || (daysRemaining !== null && daysRemaining <= 3)
      }
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).json({ message: "Dashboard error" });
  }
});

/* =============================================================================
   ⭐ 18) GET SUBSCRIPTION STATUS FOR CURRENT USER
============================================================================= */
router.get("/user/subscription-status", auth, async (req, res) => {
  try {
    if (req.user.role !== "service") {
      return res.json({
        isServiceProvider: false,
        canPost: false,
        message: "Only service providers can post services"
      });
    }

    const provider = await ServiceProvider.findById(req.user.id)
      .select("subscription name email");
    
    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const subscriptionValid = isSubscriptionValid(provider.subscription);
    const now = new Date();
    const expiresAt = provider.subscription?.expiresAt ? new Date(provider.subscription.expiresAt) : null;
    
    let daysRemaining = null;
    if (expiresAt && expiresAt > now) {
      daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    }

    res.json({
      isServiceProvider: true,
      canPost: subscriptionValid,
      subscription: {
        active: subscriptionValid,
        expiresAt: expiresAt,
        daysRemaining: daysRemaining,
        lastPaidAt: provider.subscription?.lastPaidAt,
        amount: provider.subscription?.amount || 1500,
        currency: provider.subscription?.currency || "INR",
        needsRenewal: !subscriptionValid || (daysRemaining !== null && daysRemaining <= 3)
      },
      provider: {
        id: provider._id,
        name: provider.name,
        email: provider.email
      }
    });
  } catch (err) {
    console.error("Subscription status error:", err);
    res.status(500).json({ error: "Failed to check subscription status" });
  }
});

/* =============================================================================
   ⭐ 19) FORGOT PASSWORD
============================================================================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await ServiceProvider.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "Email not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
  user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

     const resetLink =
      `${process.env.CLIENT_URL}/service-reset-password/${token}`;

    await sendMail({
      to: email,
      subject: "Reset Service Provider Password",
      html: `
        <p>Click below to reset password:</p>
        <a href="${resetLink}">${resetLink}</a>
      `,
    });

    return res.json({ success: true });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Failed to send reset link" });
  }
});

/* =============================================================================
   ⭐ 20) RESET PASSWORD
============================================================================= */
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body; // ✅ THIS WAS MISSING

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const user = await ServiceProvider.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    user.password = password; // ✅ let pre-save hook hash it
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Reset failed" });
  }
});

/* =============================================================================
   ⭐ 21) ADMIN — UPDATE PROVIDER
============================================================================= */
router.put("/admin/:id", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Admins only" });

    const updated = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Provider not found" });

    res.json({ message: "Provider updated", provider: updated });
  } catch {
    res.status(500).json({ error: "Update failed" });
  }
});

/* =============================================================================
   ⭐ 22) ADMIN — DELETE PROVIDER
============================================================================= */
router.delete("/admin/:id", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Admins only" });

    const deleted = await ServiceProvider.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ error: "Provider not found" });

    res.json({ message: "Provider deleted" });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});

/* =============================================================================
   ⭐ 23) SERVICE PROVIDER EMAIL VERIFICATION
============================================================================= */
router.get('/verify-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Find service provider by email
    const provider = await ServiceProvider.findOne({ email })
      .select('-password -resetToken -resetTokenExpiry');
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found with this email'
      });
    }
    
    // Check subscription status
    const subscriptionValid = isSubscriptionValid(provider.subscription);
    const now = new Date();
    const expiresAt = provider.subscription?.expiresAt ? new Date(provider.subscription.expiresAt) : null;
    
    let daysRemaining = null;
    if (expiresAt && expiresAt > now) {
      daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    }
    
    // Return provider info
    res.json({
      success: true,
      exists: true,
      userId: provider._id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
      serviceCategory: provider.serviceCategory,
      serviceTypes: provider.serviceTypes || [],
      status: provider.status,
      subscription: {
        ...provider.subscription,
        isValid: subscriptionValid,
        expiresAt: expiresAt,
        daysRemaining: daysRemaining,
        needsRenewal: !subscriptionValid || (daysRemaining !== null && daysRemaining <= 3)
      },
      documents: provider.documents ? {
        aadhar: !!provider.documents.aadhar,
        voter: !!provider.documents.voter,
        pan: !!provider.documents.pan
      } : null,
      createdAt: provider.createdAt,
      referralAgent: provider.referralAgent,
      referralMarketingExecutive: {
        name: provider.referralMarketingExecutiveName,
        id: provider.referralMarketingExecutiveId
      }
    });
    
  } catch (error) {
    console.error('Service provider email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
});

/* =============================================================================
   ⭐ 24) GET SERVICE PROVIDER BY EMAIL (QUERY PARAMETER)
============================================================================= */
router.get('/by-email', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter is required'
      });
    }
    
    // Find provider by email, exclude sensitive data
    const provider = await ServiceProvider.findOne({ email })
      .select('-password -resetToken -resetTokenExpiry -tokens');
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }
    
    // Add subscription status
    const providerData = provider.toObject();
    providerData.subscriptionValid = isSubscriptionValid(provider.subscription);
    
    // Calculate days remaining if subscription exists
    if (provider.subscription?.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(provider.subscription.expiresAt);
      if (expiresAt > now) {
        providerData.daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      } else {
        providerData.daysRemaining = 0;
      }
    }
    
    res.json({
      success: true,
      data: providerData
    });
    
  } catch (error) {
    console.error('Get service provider by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/* =============================================================================
   ⭐ 25) CHECK SUBSCRIPTION STATUS BY ID
============================================================================= */
router.get('/subscription-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const provider = await ServiceProvider.findById(id)
      .select('subscription name email serviceCategory status');
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }
    
    const subscriptionValid = isSubscriptionValid(provider.subscription);
    const now = new Date();
    const expiresAt = provider.subscription?.expiresAt ? new Date(provider.subscription.expiresAt) : null;
    
    let daysRemaining = null;
    if (expiresAt && expiresAt > now) {
      daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    }
    
    res.json({
      success: true,
      data: {
        subscription: provider.subscription,
        isActive: subscriptionValid,
        subscriptionValid: subscriptionValid,
        expiresAt: expiresAt,
        daysRemaining: daysRemaining,
        needsRenewal: !subscriptionValid || (daysRemaining !== null && daysRemaining <= 3),
        name: provider.name,
        email: provider.email,
        serviceCategory: provider.serviceCategory,
        status: provider.status,
        canPostServices: subscriptionValid
      }
    });
    
  } catch (error) {
    console.error('Service provider subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/* =============================================================================
   ⭐ 26) UPDATE SERVICE PROVIDER SUBSCRIPTION AFTER PAYMENT
============================================================================= */
router.post('/update-subscription/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      planName = "Monthly Service Provider Plan", 
      amount = 1500, 
      durationDays = 30, 
      paymentId, 
      paymentMethod = "cashfree",
      paymentGateway = "cashfree",
      currency = "INR"
    } = req.body;
    
    const provider = await ServiceProvider.findById(id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }
    
    // Calculate expiry date
    const activatedAt = new Date();
    const expiresAt = new Date(activatedAt);
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    
    // Get previous subscription data for reference
    const previousSubscription = provider.subscription ? { ...provider.subscription } : null;
    
    // Update subscription
    provider.subscription = {
      planName,
      amount: Number(amount),
      currency,
      status: 'active',
      active: true,
      paymentId,
      paymentMethod,
      paymentGateway,
      lastPaidAt: activatedAt,
      activatedAt: activatedAt,
      expiresAt: expiresAt,
      previousSubscription: previousSubscription ? {
        expiresAt: previousSubscription.expiresAt,
        lastPaidAt: previousSubscription.lastPaidAt
      } : null
    };
    
    await provider.save();
    
    // Send renewal confirmation email
    try {
      await sendMail({
        to: provider.email,
        subject: 'Service Provider Subscription Renewed Successfully',
        html: `
          <h2>Subscription Renewal Confirmation</h2>
          <p>Dear ${provider.name},</p>
          <p>Your service provider subscription has been renewed successfully.</p>
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Plan:</strong> ${planName}</p>
            <p><strong>Amount:</strong> ${amount} ${currency}</p>
            <p><strong>Payment ID:</strong> ${paymentId || 'N/A'}</p>
            <p><strong>Activated On:</strong> ${activatedAt.toLocaleDateString()}</p>
            <p><strong>Valid Until:</strong> ${expiresAt.toLocaleDateString()}</p>
          </div>
          <p>You can now continue posting and managing your services.</p>
          <p>Thank you for being a valued service provider!</p>
          <p>Best regards,<br>Real Estate Portal Team</p>
        `
      });
    } catch (emailError) {
      console.error('Renewal email failed:', emailError);
      // Don't fail the request if email fails
    }
    
    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: {
        subscription: provider.subscription,
        expiresAt: provider.subscription.expiresAt,
        subscriptionValid: true
      }
    });
    
  } catch (error) {
    console.error('Update service provider subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription'
    });
  }
});

/* =============================================================================
   ⭐ 27) CHECK IF SERVICE PROVIDER CAN POST (USEFUL FOR FRONTEND)
============================================================================= */
router.get('/can-post-services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const provider = await ServiceProvider.findById(id)
      .select('subscription name email status');
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        canPost: false,
        message: 'Service provider not found'
      });
    }
    
    const subscriptionValid = isSubscriptionValid(provider.subscription);
    const now = new Date();
    const expiresAt = provider.subscription?.expiresAt ? new Date(provider.subscription.expiresAt) : null;
    
    let daysRemaining = null;
    if (expiresAt && expiresAt > now) {
      daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    }
    
    res.json({
      success: true,
      canPost: subscriptionValid && provider.status === 'active',
      subscriptionValid: subscriptionValid,
      status: provider.status,
      expiresAt: expiresAt,
      daysRemaining: daysRemaining,
      needsRenewal: !subscriptionValid || (daysRemaining !== null && daysRemaining <= 3),
      providerName: provider.name,
      providerEmail: provider.email
    });
    
  } catch (error) {
    console.error('Check can post services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/* =============================================================================
   ⭐ 28) GET SERVICE PROVIDER SERVICES COUNT (FOR DASHBOARD)
============================================================================= */
router.get('/services-count/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const provider = await ServiceProvider.findById(id).select('name email');
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }
    
    const totalServices = await Service.countDocuments({ provider: id });
    const activeServices = await Service.countDocuments({ 
      provider: id,
      'subscriptionValid': true 
    });
    
    res.json({
      success: true,
      data: {
        providerId: id,
        providerName: provider.name,
        totalServices: totalServices,
        activeServices: activeServices,
        inactiveServices: totalServices - activeServices
      }
    });
    
  } catch (error) {
    console.error('Get services count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post("/service-provider/renewal/verify-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }

    const provider = await ServiceProvider.findOne({ email: email.toLowerCase() });

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: "Service provider not found",
      });
    }

    const now = new Date();
    const expiresAt = provider.subscription?.expiresAt
      ? new Date(provider.subscription.expiresAt)
      : null;

    const isActive =
      provider.subscription?.active && expiresAt && expiresAt > now;

    return res.json({
      success: true,
      user: {
        id: provider._id,
        name: provider.name,
        email: provider.email,
        phone: provider.phone,
      },
      subscription: {
        active: isActive,
        expiresAt,
        isExpired: !isActive,
      },
    });
  } catch (err) {
    console.error("❌ Service provider email verify error:", err);
    res.status(500).json({ success: false, error: "Verification failed" });
  }
});

router.post("/service-provider/renewal/create-order", async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: "userId and email required" });
    }

    const provider = await ServiceProvider.findById(userId);
    if (!provider) {
      return res.status(404).json({ error: "Service provider not found" });
    }

    if (provider.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: "Email verification failed" });
    }

    const orderId = `RENEW_SERVICE_${userId}_${Date.now()}`;
    const amount = 1500;

    const frontendUrl = process.env.CLIENT_URL;
    const returnUrl = new URL("/renewal-success", frontendUrl);
    returnUrl.searchParams.set("order_id", orderId);
    returnUrl.searchParams.set("user_id", userId);
    returnUrl.searchParams.set("userType", "service");

    const response = await Cashfree.PGCreateOrder("2023-08-01", {
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_email: provider.email,
        customer_phone: provider.phone || "9999999999",
        customer_name: provider.name,
      },
      order_meta: {
        return_url: returnUrl.toString(),
      },
      order_note: `Service Provider Renewal: ${provider.name}`,
    });

    await Transaction.create({
      orderId,
      userId,
      userType: "service",
      amount,
      status: "initiated",
      paymentSessionId: response.data.payment_session_id,
      timestamp: new Date(),
    });

    return res.json({
      success: true,
      orderId,
      paymentSessionId: response.data.payment_session_id,
      amount,
    });
  } catch (err) {
    console.error("❌ Service renewal create order error:", err);
    res.status(500).json({ success: false, error: "Order creation failed" });
  }
});
router.post("/service-provider/renewal/verify-payment", async (req, res) => {
  try {
    const { orderId, userId } = req.body;

    if (!orderId || !userId) {
      return res.status(400).json({ success: false, error: "Invalid request" });
    }

    const provider = await ServiceProvider.findById(userId);
    if (!provider) {
      return res.status(404).json({ success: false, error: "Provider not found" });
    }

    let paymentData = null;

    const paymentResponse = await Cashfree.PGOrderPayments(
      "2023-08-01",
      orderId
    );

    if (Array.isArray(paymentResponse.data)) {
      paymentData = paymentResponse.data.find(
        (p) => p.payment_status === "SUCCESS"
      );
    }

    if (!paymentData) {
      return res.status(400).json({
        success: false,
        error: "Payment not verified yet",
      });
    }

    const now = new Date();
    const currentExpiry = provider.subscription?.expiresAt
      ? new Date(provider.subscription.expiresAt)
      : null;

    const baseDate =
      currentExpiry && currentExpiry > now ? currentExpiry : now;

    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    provider.subscription = {
      active: true,
      expiresAt: newExpiry,
      lastPaidAt: now,
      paymentGateway: "cashfree",
      paymentStatus: "SUCCESS",
      cashfreeOrderId: orderId,
      cashfreePaymentId: paymentData.cf_payment_id,
      amount: paymentData.payment_amount,
      currency: paymentData.payment_currency,
    };

    await provider.save();

    /* 📧 SEND EMAIL */
    try {
      const { sendMail } = require("../utils/emailTemplates");

      await sendMail({
        to: provider.email,
        subject: "Service Provider Subscription Renewed",
        html: `
          <h2>Subscription Renewed 🎉</h2>
          <p>Hello ${provider.name},</p>

          <p>Your <strong>Service Provider subscription</strong> has been renewed successfully.</p>

          <p><b>Amount:</b> ₹${paymentData.payment_amount}</p>
          <p><b>Valid till:</b> ${newExpiry.toLocaleDateString()}</p>

          <p>Thank you for continuing with us.</p>
          <p>— RealEstate24X7 Team</p>
        `,
      });
    } catch (e) {
      console.warn("⚠️ Service provider email failed:", e.message);
    }

    return res.json({
      success: true,
      message: "Subscription renewed successfully",
      subscription: {
        active: true,
        expiresAt: newExpiry,
      },
    });
  } catch (err) {
    console.error("❌ Service provider verify error:", err);
    res.status(500).json({ success: false, error: "Verification failed" });
  }
});

/* =============================================================================
   ⭐ 29) GET SUBSCRIPTION STATUS (UNIFIED FOR FRONTEND)
============================================================================= */
router.get("/subscription-status/me", auth, async (req, res) => {
  try {
    if (req.user.role !== "service") {
      return res.status(403).json({ 
        success: false, 
        error: "Service providers only" 
      });
    }

    const provider = await ServiceProvider.findById(req.user.id)
      .select("subscription name email businessName phone createdAt");
    
    if (!provider) {
      return res.status(404).json({ 
        success: false, 
        error: "Provider not found" 
      });
    }

    const subscription = provider.subscription || {};
    const now = new Date();
    const expiresAt = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
    
    // Check if subscription is active
    const isActive = subscription.active && expiresAt && expiresAt > now;
    
    // Calculate days remaining/expired
    let daysRemaining = 0;
    let daysExpired = 0;
    
    if (expiresAt) {
      const diffDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        daysRemaining = diffDays;
      } else {
        daysExpired = Math.abs(diffDays);
      }
    }

    // Check if renewal is needed
    const needsRenewal = !isActive || daysRemaining <= 7;

    const subscriptionStatus = {
      active: isActive,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      daysRemaining,
      daysExpired,
      needsRenewal,
      lastPaidAt: subscription.lastPaat || null,
      paymentGateway: subscription.paymentGateway || null,
      amount: subscription.amount || 1500,
      currency: subscription.currency || "INR",
      planType: subscription.planType || "basic",
      paymentStatus: subscription.paymentStatus || "pending"
    };

    res.json({
      success: true,
      provider: {
        id: provider._id,
        name: provider.name,
        email: provider.email,
        businessName: provider.businessName,
        phone: provider.phone,
        createdAt: provider.createdAt
      },
      subscription: subscriptionStatus,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("Subscription status error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get subscription status" 
    });
  }
});


module.exports = router;