const express = require("express");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const jwt = require("jsonwebtoken");
const path = require("path");
const multer = require("multer");
const { auth } = require("../middleware/auth");
const Agent = require("../models/Agent");
const Property = require("../models/Property");
const Enquiry = require("../models/Enquiry");
const ServiceProvider = require("../models/ServiceProvider");
const crypto = require("crypto");
const sendMail = require("../utils/sendMail");
const Cashfree = require("../utils/cashfree");



const router = express.Router();

/* ------------------ MULTER ------------------ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/voterIds"),
  filename: (req, file, cb) =>
    cb(
      null,
      Date.now() +
        "-" +
        Math.floor(Math.random() * 1e9) +
        path.extname(file.originalname)
    ),
});
const upload = multer({ storage });

function generateAgentId() {
  return "AGT-" + Math.floor(1000 + Math.random() * 9000);
}

/* ===========================================================
   🟢 GET ALL AGENTS (Admin only)
   =========================================================== */
router.get("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied" });

    const agents = await Agent.find()
      .select("agentId name email phone commissionPercent createdAt");

    res.json(agents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching agents" });
  }
});

/* ===========================================================
   🟢 REGISTER AGENT (UPDATED)
   =========================================================== */
router.post("/register", upload.single("voterIdFile"), async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      aadhaarNumber,
      panNumber,
      profession,
      bankDetails,
      commissionPercent,

      referralExecutiveName,
      referralExecutiveId, // <-- ADDED
    } = req.body;

    if (await Agent.findOne({ email }))
      return res.status(400).json({ error: "Agent already exists" });

    const baseUrl = `${req.protocol}://${req.get("host")}`;

const voterIdFile = req.file
  ? `${baseUrl}/uploads/voterIds/${req.file.filename}`
  : null;


    const newAgent = new Agent({
      agentId: generateAgentId(),
      name,
      email,
      phone,
      password,
      aadhaarNumber,
      panNumber,
      profession,
      voterIdFile,
      bankDetails,
      commissionPercent,

      referralExecutiveName,
      referralExecutiveId, // <-- STORE MEID
    });

    await newAgent.save();

    res.json({
      message: "Agent registered successfully",
      agent: {
        _id: newAgent._id,
        agentId: newAgent.agentId,
        name: newAgent.name,
        email: newAgent.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration error" });
  }
});

/* ===========================================================
   🟢 LOGIN AGENT
   =========================================================== */
/* ===========================================================
   🟢 LOGIN AGENT (UPDATED with Subscription Check)
   =========================================================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const agent = await Agent.findOne({ email });
    if (!agent) return res.status(400).json({ error: "Invalid credentials" });

    const match = await agent.comparePassword(password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    // ✅ Ensure subscription exists
    if (!agent.subscription || Object.keys(agent.subscription).length === 0) {
      console.log(`⚠️ Agent ${agent._id} has no subscription, creating default...`);
      
      agent.subscription = {
        active: false,
        expiresAt: null,
        lastPaidAt: null,
        paymentGateway: null,
        amount: 2000,
        currency: "INR",
        needsRenewal: true
      };
      
      await agent.save();
    }

    // ✅ Check if subscription is active
    const now = new Date();
    const expiresAt = agent.subscription?.expiresAt ? new Date(agent.subscription.expiresAt) : null;
    const isActive = agent.subscription?.active && expiresAt && expiresAt > now;
    
    // ✅ If subscription is NOT active/expired
    if (!isActive) {
      // Calculate how many days expired (if applicable)
      const daysExpired = expiresAt ? Math.floor((now - expiresAt) / (1000 * 60 * 60 * 24)) : 999;
      
      return res.status(403).json({
        success: false,
        error: "SUBSCRIPTION_EXPIRED",
        message: "Your subscription has expired. Please renew to continue.",
        data: {
          userId: agent._id,
          email: agent.email,
          name: agent.name,
          agentId: agent.agentId,
          userType: "agent",
          daysExpired: daysExpired,
          expiresAt: expiresAt,
          redirectTo: "/renew" // Frontend renewal page
        }
      });
    }

    // ✅ Subscription is ACTIVE - Generate token
    const token = jwt.sign(
      { 
        id: agent._id, 
        role: "agent",
        email: agent.email,
        name: agent.name,
        subscription: agent.subscription,
        subscriptionValid: true
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      agent: {
        _id: agent._id,
        agentId: agent.agentId,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        commissionPercent: agent.commissionPercent,
        subscription: agent.subscription,
        subscriptionActive: true
      },
    });
  } catch (err) {
    console.error("Agent login error:", err);
    res.status(500).json({ 
      success: false,
      error: "Login error" 
    });
  }
});
/* ===========================================================
   🟢 GET LOGGED-IN AGENT (SAFE)
=========================================================== */
router.get("/me", auth, async (req, res) => {
  try {
    if (req.user.role !== "agent") {
      return res.status(403).json({ error: "Agent access only" });
    }

    // ADD .lean() to get fresh data from DB (not cached)
    const agent = await Agent.findById(req.user.id)
      .select("-password")
      .lean(); // ⬅️ CRITICAL: Get fresh data
    
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // MANUALLY ensure expiresAt exists if paidAt exists
    if (agent.subscription && agent.subscription.paidAt && !agent.subscription.expiresAt) {
      const paidAt = new Date(agent.subscription.paidAt);
      const expiresAt = new Date(paidAt);
      expiresAt.setMonth(expiresAt.getMonth() + 1); // Add 30 days
      agent.subscription.expiresAt = expiresAt.toISOString();
      
      // Also update in database for next time
      await Agent.findByIdAndUpdate(
        req.user.id,
        { "subscription.expiresAt": expiresAt }
      );
    }

    console.log("=== DEBUG AGENT ME AFTER FIX ===");
    console.log("expiresAt exists?", !!agent.subscription?.expiresAt);
    console.log("expiresAt value:", agent.subscription?.expiresAt);
    console.log("======================");
    
    res.json(agent);
  } catch (err) {
    console.error("GET /agents/me error:", err);
    res.status(500).json({ error: "Failed to load agent profile" });
  }
});

/* ===========================================================
   📊 GET AGENT SUBSCRIPTION STATUS
   =========================================================== */
router.get("/subscription-status", auth, async (req, res) => {
  try {
    console.log("📊 Subscription status request from:", req.user.id);
    
    // Verify user is an agent
    if (req.user.role !== "agent") {
      console.log("❌ Not an agent, role:", req.user.role);
      return res.status(403).json({ 
        success: false, 
        error: "Access denied. Agent only." 
      });
    }

    // Find agent
    const agent = await Agent.findById(req.user.id)
      .select("subscription name email agentId phone createdAt");
    
    if (!agent) {
      console.log("❌ Agent not found:", req.user.id);
      return res.status(404).json({ 
        success: false, 
        error: "Agent not found" 
      });
    }

    // Ensure subscription exists
    if (!agent.subscription || Object.keys(agent.subscription).length === 0) {
      console.log("⚠️ No subscription found for agent:", agent.email);
      agent.subscription = {
        active: false,
        expiresAt: null,
        lastPaidAt: null,
        paymentGateway: null,
        amount: 2000,
        currency: "INR",
        needsRenewal: true
      };
      await agent.save();
    }

    // Calculate subscription status
    const subscription = agent.subscription;
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

    // Prepare response
    const subscriptionStatus = {
      active: isActive,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      daysRemaining,
      daysExpired,
      needsRenewal,
      lastPaidAt: subscription.lastPaidAt || null,
      paymentGateway: subscription.paymentGateway || null,
      amount: subscription.amount || 2000,
      currency: subscription.currency || "INR",
      planType: subscription.planType || "basic",
      paymentStatus: subscription.paymentStatus || "pending"
    };

    console.log("✅ Subscription status for", agent.email, ":", {
      active: isActive,
      daysRemaining,
      expiresAt: expiresAt?.toISOString()
    });

    // Send response
    res.json({
      success: true,
      agent: {
        id: agent._id,
        name: agent.name,
        email: agent.email,
        agentId: agent.agentId,
        phone: agent.phone,
        createdAt: agent.createdAt
      },
      subscription: subscriptionStatus,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ Subscription status error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get subscription status" 
    });
  }
});
/* ===========================================================
   ✅ FORGOT PASSWORD
   =========================================================== */
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ error: "Email is required" });

    const agent = await Agent.findOne({ email });
    if (!agent)
      return res.status(404).json({ error: "Email not registered" });

    // ✅ Generate reset token
    const token = crypto.randomBytes(32).toString("hex");

    agent.resetToken = token;
    agent.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await agent.save();

    // ✅ Create reset link
    const resetLink =
      `${process.env.CLIENT_URL}/agent-reset-password/${token}`;

    // ✅ SEND EMAIL
    await sendMail({
      to: agent.email,
      subject: "Agent Password Reset",
      html: `
        <h3>Password Reset</h3>
        <p>Click below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    res.json({
      success: true,
      message: "Reset link sent to your email",
    });

  } catch (err) {
    next(err); // ✅ handled by global errorHandler
  }
});

/* ===========================================================
   ✅ RESET PASSWORD
   =========================================================== */
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password)
      return res.status(400).json({ error: "Password is required" });

    const agent = await Agent.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!agent)
      return res.status(400).json({ error: "Invalid or expired token" });

    agent.password = password; // ✅ auto-hashes via schema
    agent.resetToken = undefined;
    agent.resetTokenExpiry = undefined;
    await agent.save();

    res.json({
      success: true,
      message: "Password reset successful",
    });

  } catch (err) {
    console.error("AGENT RESET ERROR:", err);
    res.status(500).json({ error: "Reset password failed" });
  }
});



/* ===========================================================
   🟢 GET PROPERTIES OF AGENT
   =========================================================== */
router.get("/:id/properties", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const props = await Property.find({
      $or: [
        { agent: req.params.id },
        { owner: req.params.id }
      ]
    })
      .populate("agent", "_id name email")
      .populate("owner", "_id name email")
      .sort({ createdAt: -1 });

    res.json(props);
  } catch (err) {
    console.error("Agent properties error:", err);
    res.status(500).json({ error: "Error loading properties" });
  }
});

/* ===========================================================
   🟢 GET REFERRED SERVICE PROVIDERS
   =========================================================== */
router.get("/referred-service-providers", auth, async (req, res) => {
  try {
    if (req.user.role !== "agent") {
      return res.status(403).json({ error: "Agent access only" });
    }

    const list = await ServiceProvider.find({
      referralAgent: req.user.id
    })
      .select("name email phone serviceCategory status createdAt");

    res.json(list);
  } catch (err) {
    console.error("Referral fetch error:", err);
    res.status(500).json({ error: "Failed to fetch referral list" });
  }
});

/* ===========================================================
   🟢 GET ENQUIRIES OF AGENT
   =========================================================== */
router.get("/:id/enquiries", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const enqs = await Enquiry.find({ agent: req.params.id })
      .populate("property", "title price areaName")
      .sort({ createdAt: -1 });

    res.json(enqs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error loading enquiries" });
  }
});

/* ===========================================================
   🟢 GET SINGLE AGENT
   =========================================================== */
/* ===========================================================
   🟢 GET SINGLE AGENT (WITH FIX)
   =========================================================== */
router.get("/:id", auth, async (req, res) => {
  try {
    const agentId = req.params.id;
    
    // ✅ EARLY VALIDATION - Check for undefined/null
    if (!agentId || agentId === "undefined" || agentId === "null") {
      console.error("Invalid agent ID requested:", agentId);
      return res.status(400).json({ 
        error: "Valid Agent ID is required",
        code: "INVALID_AGENT_ID"
      });
    }
    
    // ✅ Validate MongoDB ObjectId format (if not "me")
    if (agentId !== "me" && !mongoose.isValidObjectId(agentId)) {
      return res.status(400).json({ 
        error: "Invalid Agent ID format",
        code: "INVALID_ID_FORMAT"
      });
    }
    
    // ✅ Handle "me" or "self" requests
    if (agentId === "me" || agentId === "self") {
      if (req.user.role !== "agent") {
        return res.status(403).json({ error: "Agent access only" });
      }
      
      const agent = await Agent.findById(req.user.id);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      return res.json(agent);
    }
    
    // ✅ Original access control logic
    const uid = req.user._id || req.user.id;
    
    if (req.user.role !== "admin" && uid !== agentId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const agent = await Agent.findById(agentId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    
    res.json(agent);
  } catch (err) {
    console.error("GET agent error:", err);
    res.status(500).json({ error: "Error loading agent" });
  }
});
/* ===========================================================
   🟢 GET AGENTS REFERRED BY MARKETING EXECUTIVE
   =========================================================== */
router.get("/referred-agents", auth, async (req, res) => {
  try {
    if (req.user.role !== "marketingExecutive") {
      return res.status(403).json({ error: "Access denied" });
    }

    // ⭐ This is the correct ME identifier from token
    const marketingId = req.user.meid; // Example: "ME-49157"

    const agents = await Agent.find({
      referralMarketingExecutiveId: marketingId
    }).select("name email phone agentId profession createdAt");

    return res.json({ success: true, agents });
  } catch (err) {
    console.error("Fetch referred agents error:", err);
    res.status(500).json({ error: "Failed to load referred agents" });
  }
});

// UPDATE agent (admin only)
router.delete("/agents/:id", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    await Agent.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Agent deleted" });
  } catch (err) {
    console.error("ADMIN DELETE ERROR:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// UPDATE AGENT (Admin only)
router.put("/agents/:id", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(agent);
  } catch (err) {
    console.error("ADMIN UPDATE ERROR:", err);
    res.status(500).json({ error: "Update failed" });
  }
});
// Add these routes to your existing agent routes

// Agent Email Verification Endpoint
/* ===========================================================
   🔓 STANDALONE RENEWAL ROUTES (NO AUTH REQUIRED)
   =========================================================== */

// 1. Verify Email for Renewal (Public)
router.post("/renewal/verify-email", async (req, res) => {
  try {
    const { email, userType } = req.body;
    
    console.log("🔍 Renewal email verification:", { email, userType });
    
    if (!email || !userType) {
      return res.status(400).json({
        success: false,
        error: "Email and user type are required"
      });
    }
    
    // Only handle agent renewals here
    if (userType !== "agent") {
      return res.status(400).json({
        success: false,
        error: "This endpoint is for agents only"
      });
    }
    
    const agent = await Agent.findOne({ email: email.toLowerCase() });
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: "Agent not found with this email"
      });
    }
    
    // Check subscription status
    const subscription = agent.subscription || {};
    const now = new Date();
    const expiresAt = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
    const isActive = subscription.active && expiresAt && expiresAt > now;
    
    return res.json({
      success: true,
      user: {
        id: agent._id,
        agentId: agent.agentId,
        name: agent.name,
        email: agent.email,
        phone: agent.phone
      },
      subscription: {
        active: isActive,
        expiresAt: expiresAt,
        isExpired: !isActive
      }
    });
    
  } catch (error) {
    console.error("Renewal email verification error:", error);
    return res.status(500).json({
      success: false,
      error: "Verification failed"
    });
  }
});

// 2. Create Renewal Order (Public)
router.post("/renewal/create-order", async (req, res) => {
  try {
    const { userId, userType, email } = req.body;

    // Validate input
    if (!userId || userType !== "agent" || !email) {
      return res.status(400).json({ 
        error: "Invalid request. Required: userId, userType='agent', email" 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Verify agent exists and email matches
    const agent = await Agent.findById(userId);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }
    
    if (agent.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: "Email verification failed" });
    }

    // Check if agent is already active (prevent duplicate renewals)
    if (agent.subscriptionStatus === 'active' && 
        agent.subscriptionExpiry > new Date()) {
      return res.status(400).json({ 
        error: "Agent subscription is already active" 
      });
    }

    // Generate unique order ID
    const orderId = `RENEW_AGENT_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const amount = 2000;

    // Validate and get frontend URL
    const frontendUrl = process.env.CLIENT_URL;
    if (!frontendUrl) {
      console.error("❌ FRONTEND_URL environment variable not configured");
      return res.status(500).json({ 
        error: "Server configuration error" 
      });
    }

    // Build return URL
    const returnUrl = new URL('/renewal-success', frontendUrl);
    returnUrl.searchParams.set('order_id', orderId);
    returnUrl.searchParams.set('user_id', userId);
    returnUrl.searchParams.set('timestamp', Date.now().toString());

    console.log("🔁 Creating order for agent:", userId, "Return URL:", returnUrl.toString());

    // Create payment order
    const response = await Cashfree.PGCreateOrder("2023-08-01", {
  order_id: orderId,
  order_amount: amount,
  order_currency: "INR",
  customer_details: {
    customer_id: userId,
    customer_email: agent.email,
    customer_phone: agent.phone || "9999999999",
    customer_name: agent.name || "Agent",
  },
  order_meta: {
    return_url: returnUrl.toString(), // ✅ ONLY THIS
  },
  order_note: `Renewal for agent: ${agent.name || userId}`,
});


    // Log the transaction in database
    await Transaction.create({
      orderId,
      userId,
      userType: 'agent',
      amount,
      status: 'initiated',
      paymentSessionId: response.data.payment_session_id,
      timestamp: new Date(),
      metadata: {
        agentEmail: agent.email,
        agentName: agent.name,
      }
    });

    // Update agent with pending renewal
    agent.pendingRenewal = {
      orderId,
      amount,
      initiatedAt: new Date()
    };
    await agent.save();

    return res.json({
      success: true,
      orderId,
      paymentSessionId: response.data.payment_session_id,
      amount,
      currency: "INR",
      customerEmail: agent.email,
      // Optional: Include Cashfree SDK configuration if needed
      sdkConfig: {
        env: process.env.CASHFREE_ENV || 'SANDBOX'
      }
    });

  } catch (err) {
    console.error("❌ Cashfree create order error:", err);
    
    // More specific error handling
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: "Payment service temporarily unavailable"
      });
    }
    
    if (err.response?.status === 400) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment request parameters",
        details: err.response.data?.message
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to create payment order",
      reference: `ERR_${Date.now()}` // For debugging
    });
  }
});
// 3. Verify Payment and Update Subscription (Public)
router.post("/renewal/verify-payment", async (req, res) => {
  try {
    const { orderId, userId, userType } = req.body;

    console.log("✅ Renewal payment verification:", { orderId, userId, userType });

    /* ===============================
       BASIC VALIDATION
    =============================== */
    if (!orderId || !userId || userType !== "agent") {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
      });
    }

    /* ===============================
       ORDER OWNERSHIP CHECK
    =============================== */
    const orderParts = orderId.split("_");
    if (orderParts.length < 4 || orderParts[0] !== "RENEW") {
      return res.status(400).json({
        success: false,
        error: "Invalid order ID format",
      });
    }

    const orderUserId = orderParts[2];
    if (orderUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Order does not belong to this user",
      });
    }

    /* ===============================
       FIND AGENT
    =============================== */
    const agent = await Agent.findById(userId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: "Agent not found",
      });
    }

    /* ===============================
       VERIFY PAYMENT WITH CASHFREE
    =============================== */
    let paymentVerified = false;
    let paymentData = null;

    try {
      const paymentResponse = await Cashfree.PGOrderPayments(
        "2023-08-01",
        orderId
      );

      if (Array.isArray(paymentResponse.data)) {
        paymentData = paymentResponse.data.find(
          (p) => p.payment_status === "SUCCESS"
        );
        if (paymentData) paymentVerified = true;
      }
    } catch (err) {
      console.error("❌ Cashfree payment check failed:", err.message);
    }

    if (!paymentVerified) {
      return res.status(400).json({
        success: false,
        error: "Payment not verified yet",
      });
    }

    /* ===============================
       CALCULATE NEW EXPIRY
    =============================== */
    const now = new Date();
    const currentExpiry = agent.subscription?.expiresAt
      ? new Date(agent.subscription.expiresAt)
      : null;

    const baseDate =
      currentExpiry && currentExpiry > now ? currentExpiry : now;

    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + 1); // 1-month renewal

    /* ===============================
       UPDATE SUBSCRIPTION
    =============================== */
    agent.subscription = {
      ...agent.subscription,
      active: true,
      paidAt: now,
      lastPaidAt: now,
      expiresAt: newExpiry,
      paymentGateway: "cashfree",
      cashfreeOrderId: orderId,
      renewalOrderId: orderId,
      cashfreePaymentId: paymentData.cf_payment_id,
      paymentStatus: "SUCCESS",
      amount: paymentData.payment_amount,
      currency: paymentData.payment_currency,
      lastRenewalDate: now,
    };

    await agent.save();

    console.log(
      `✅ Agent ${agent.email} renewed till ${newExpiry.toISOString()}`
    );

    /* ===============================
       SEND EMAIL (THIS WAS MISSING 🔥)
    =============================== */
   /* ===============================
   SEND RENEWAL EMAIL (AGENT)
=============================== */
try {
  const { sendMail } = require("../utils/emailTemplates");

  await sendMail({
    to: agent.email,
    subject: "Agent Subscription Renewed Successfully",
    html: `
      <h2>Subscription Renewal Confirmation</h2>
      <p>Dear ${agent.name},</p>

      <p>Your <strong>Agent subscription</strong> has been renewed successfully 🎉</p>

      <div style="background:#f0f9ff;padding:15px;border-radius:8px;margin:15px 0">
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Payment ID:</strong> ${paymentData.cf_payment_id}</p>
        <p><strong>Amount Paid:</strong> ₹${paymentData.payment_amount}</p>
        <p><strong>Renewal Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Valid Until:</strong> ${newExpiry.toLocaleDateString()}</p>
        <p><strong>Status:</strong> Active ✅</p>
      </div>

      <p>You can now continue posting and managing your properties.</p>

      <p>
        Regards,<br/>
        <strong>Real Estate Portal Team</strong>
      </p>
    `,
  });

  console.log("📧 Agent renewal email sent");
} catch (mailErr) {
  console.warn("⚠️ Agent renewal email failed:", mailErr.message);
}


    /* ===============================
       RESPONSE
    =============================== */
    return res.json({
      success: true,
      message: "Subscription renewed successfully",
      subscription: {
        active: true,
        expiresAt: newExpiry,
        daysRemaining: Math.ceil(
          (newExpiry - now) / (1000 * 60 * 60 * 24)
        ),
      },
    });

  } catch (error) {
    console.error("❌ Renewal payment verification error:", error);
    return res.status(500).json({
      success: false,
      error: "Payment verification failed",
    });
  }
});


module.exports = router;
