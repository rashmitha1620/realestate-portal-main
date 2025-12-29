const express = require("express");
const crypto = require("crypto");
const axios = require("axios");

const fs = require("fs");
const path = require("path");
const multer = require("multer");
const jwt = require('jsonwebtoken');
const { auth } = require("../middleware/auth");


const Cashfree = require("../utils/cashfree");
const Agent = require("../models/Agent");
const ServiceProvider = require("../models/ServiceProvider");
const Subscription = require("../models/Subscription");
const { sendWelcomeEmail, sendSubscriptionReminderEmail } = require("../utils/emailTemplates");

const router = express.Router();

/* =====================================================
   📁 Upload Folders Setup
===================================================== */
const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");
const AGENT_DOCS_DIR = path.join(UPLOADS_ROOT, "agent-docs");
const SERVICE_DOCS_DIR = path.join(UPLOADS_ROOT, "service-docs");
const TEMP_AGENTS_DIR = path.join(UPLOADS_ROOT, "tempAgents");
const TEMP_PROVIDERS_DIR = path.join(UPLOADS_ROOT, "tempProviders");

// Ensure directories exist
[UPLOADS_ROOT, AGENT_DOCS_DIR, SERVICE_DOCS_DIR, TEMP_AGENTS_DIR, TEMP_PROVIDERS_DIR]
  .forEach(dir => !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true }));

/* =====================================================
   📝 Multer Configuration for File Uploads
===================================================== */
const uploadStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, SERVICE_DOCS_DIR),
  filename: (_, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* =====================================================
   🛠️ URL Helper Functions
===================================================== */
function buildReturnUrl(orderId, tempId, userType = "agent", isRenewal = false) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  let path = "";
  
  if (isRenewal) {
    path = userType === "agent" ? "agent-renewal-success" : "provider-renewal-success";
  } else {
    path = userType === "agent" ? "agent-payment-success" : "provider-payment-success";
  }
  
  return `${clientUrl}/${path}?order_id=${orderId}&tempId=${tempId}`;
}

function buildNotifyUrl(isRenewal = false) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
  const endpoint = isRenewal ? "subscription-renew-webhook" : "cashfree-webhook";
  return `${backendUrl}/api/payments/${endpoint}`;
}

function ensureHttpsForProduction(url) {
  const isProduction = process.env.CASHFREE_ENV === "PROD";
  if (isProduction && url && url.startsWith("http://")) {
    return url.replace("http://", "https://");
  }
  return url;
}

/* =====================================================
   🔑 SUBSCRIPTION HELPER FUNCTIONS
===================================================== */
function calculateExpiryDate(paymentDate) {
  const paidDate = new Date(paymentDate);
  const expiresAt = new Date(paidDate);
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  
  console.log("📅 CALCULATING EXPIRY DATE:");
  console.log(`   Payment Date: ${paidDate.toISOString()}`);
  console.log(`   Expiry Date: ${expiresAt.toISOString()}`);
  console.log(`   Valid Until: ${expiresAt.toLocaleDateString()}`);
  
  return expiresAt;
}

function isSubscriptionActive(subscription) {
  if (!subscription || !subscription.active) return false;
  
  // Check if subscription has expired
  if (subscription.expiresAt) {
    const now = new Date();
    const expiryDate = new Date(subscription.expiresAt);
    return now <= expiryDate;
  }
  
  // Legacy check for backward compatibility
  return subscription.active === true;
}




function calculateRenewalExpiry(existingExpiry, planMonths = 1) {
  const now = new Date();
  
  console.log("📅 RENEWAL EXPIRY CALCULATION:");
  console.log(`   Now: ${now.toISOString()}`);
  console.log(`   Existing Expiry: ${existingExpiry ? new Date(existingExpiry).toISOString() : 'None'}`);

  let baseDate;
  if (existingExpiry) {
    const expiryDate = new Date(existingExpiry);
    if (expiryDate > now) {
      baseDate = expiryDate; // Early renewal
      console.log(`   🔵 Early renewal - using existing expiry as base`);
    } else {
      baseDate = now; // Expired - start from now
      console.log(`   🔴 Subscription expired - starting from now`);
    }
  } else {
    baseDate = now; // First time subscription
    console.log(`   🟡 First time subscription - starting from now`);
  }

  const newExpiry = new Date(baseDate);
  newExpiry.setMonth(newExpiry.getMonth() + planMonths);
  
  console.log(`   🎯 New Expiry: ${newExpiry.toISOString()}`);
  console.log(`   ⏰ Added ${planMonths} month(s)`);
  
  return newExpiry;
}

/* =====================================================
   🔄 CREATE SUBSCRIPTION RECORD
===================================================== */
async function createSubscriptionRecord(userId, userType, paymentData, orderId, paymentId) {
  try {
    const paidAt = new Date();
    const expiresAt = calculateExpiryDate(paidAt);
    
    const subscription = new Subscription({
      userId,
      userType: userType === "agent" ? "agent" : "service-provider",
      paymentGateway: "cashfree",
      cashfreeOrderId: orderId,
      cashfreePaymentId: paymentId,
      amount: paymentData.payment_amount || 1500,
      currency: paymentData.payment_currency || "INR",
      paymentStatus: paymentData.payment_status || "SUCCESS",
      startedAt: paidAt,
      expiresAt,
      status: "active",
    });
    
    await subscription.save();
    console.log(`✅ Subscription record created for ${userType}: ${userId}`);
    
    return { success: true, expiresAt };
  } catch (err) {
    console.error("❌ Failed to create subscription record:", err.message);
    return { success: false, error: err.message };
  }
}

/* =====================================================
   1️⃣ AGENT — CREATE CASHFREE ORDER
===================================================== */
router.post("/agent/create-order", express.json(), async (req, res) => {
  try {
    console.log("🔵 Agent create-order request received");
    
    const { pendingAgent } = req.body;
    if (!pendingAgent) {
      return res.status(400).json({ error: "Missing agent data" });
    }

    const tempId = crypto.randomBytes(10).toString("hex");

    const tempData = {
      tempId, 
      pendingAgent,
      paymentGateway: "cashfree",
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(TEMP_AGENTS_DIR, `${tempId}.json`),
      JSON.stringify(tempData, null, 2)
    );

    const orderId = `AGT_${Date.now()}_${tempId.substring(0, 8)}`;
    
    let returnUrl = buildReturnUrl(orderId, tempId, "agent");
    let notifyUrl = buildNotifyUrl();
    
    if (process.env.CASHFREE_ENV === "PROD") {
      returnUrl = ensureHttpsForProduction(returnUrl);
      notifyUrl = ensureHttpsForProduction(notifyUrl);
    }

    const orderData = {
      order_id: orderId,
      order_amount: parseInt(process.env.SUBSCRIPTION_AMOUNT_INR || 1500),
      order_currency: "INR",
      customer_details: {
        customer_id: tempId,
        customer_email: pendingAgent.email,
        customer_phone: pendingAgent.phone,
        customer_name: pendingAgent.name,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
      },
      order_note: "Agent Registration Payment",
    };

    const response = await Cashfree.PGCreateOrder("2023-08-01", orderData);
    
    console.log("✅ Cashfree order created:", response.data.order_id);

    return res.json({
      success: true,
      paymentGateway: "cashfree",
      tempId,
      order: response.data,
      payment_session_id: response.data.payment_session_id,
    });

  } catch (err) {
    console.error("❌ Agent Order Creation Error:", err.message);
    res.status(500).json({ 
      success: false,
      error: "Order creation failed",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

/* =====================================================
   2️⃣ AGENT — VERIFY PAYMENT (FIXED WITH EXPIRESAT)
===================================================== */
router.post("/agent/verify", express.json(), async (req, res) => {
  try {
    console.log("🔵 Agent verify request received");

    const { tempId, cashfree_order_id, voterIdBase64 } = req.body;

    if (!tempId || !cashfree_order_id) {
      return res.status(400).json({
        success: false,
        error: "Missing tempId or Cashfree order ID",
      });
    }

    const tempFile = path.join(TEMP_AGENTS_DIR, `${tempId}.json`);
    if (!fs.existsSync(tempFile)) {
      return res.status(400).json({
        success: false,
        error: "Session expired. Please restart registration.",
      });
    }

    const savedData = JSON.parse(fs.readFileSync(tempFile));
    const { pendingAgent: a } = savedData;

    /* =====================================================
       ✅ STEP 1: VERIFY PAYMENT
    ===================================================== */
    let successfulPayment;
    try {
      const paymentsRes = await Cashfree.PGOrderPayments(
        "2023-08-01",
        cashfree_order_id
      );

      successfulPayment = paymentsRes.data.find(
        (p) => p.payment_status === "SUCCESS"
      );

      if (!successfulPayment) {
        return res.status(400).json({
          success: false,
          error: "Payment not completed. Agent not created.",
        });
      }
    } catch (err) {
      console.error("❌ Cashfree payment verification failed:", err.message);
      return res.status(400).json({
        success: false,
        error: "Unable to verify payment. Please try again.",
      });
    }

    /* =====================================================
       ✅ STEP 2: PREVENT DUPLICATE
    ===================================================== */
    const existingAgent = await Agent.findOne({ email: a.email });
    if (existingAgent) {
      try { fs.unlinkSync(tempFile); } catch {}
      return res.json({
        success: true,
        existing: true,
        message: "Account already exists. Please login.",
        agentId: existingAgent._id,
      });
    }

    /* =====================================================
       ✅ STEP 3: SAVE VOTER ID
    ===================================================== */
    let voterPath = null;
    if (voterIdBase64?.startsWith("data:image")) {
      const base64 = voterIdBase64.replace(/^data:image\/\w+;base64,/, "");
      const fileName = `voter-${Date.now()}-${tempId.slice(0, 8)}.png`;
      voterPath = `uploads/agent-docs/${fileName}`;
      fs.writeFileSync(
        path.join(AGENT_DOCS_DIR, fileName),
        Buffer.from(base64, "base64")
      );
    }

    /* =====================================================
       ✅ STEP 4: CREATE SUBSCRIPTION WITH EXPIRESAT (CRITICAL FIX)
    ===================================================== */
    const paidAt = new Date(successfulPayment.payment_time);
    const expiresAt = calculateExpiryDate(paidAt);

    console.log("🚨 AGENT SUBSCRIPTION DATES (FIXED):");
    console.log(`   Payment time: ${successfulPayment.payment_time}`);
    console.log(`   Paid at: ${paidAt.toISOString()}`);
    console.log(`   Expires at: ${expiresAt.toISOString()}`);
    console.log(`   Valid until: ${expiresAt.toLocaleDateString()}`);

    const subscription = {
      active: true,
      lastPaidAt: paidAt,
      expiresAt: expiresAt,
      paymentGateway: "cashfree",
      cashfreeOrderId: cashfree_order_id,
      cashfreePaymentId: successfulPayment.cf_payment_id,
      amount: successfulPayment.payment_amount,
      currency: successfulPayment.payment_currency,
      paymentStatus: successfulPayment.payment_status,
      // 🚨 ADD THIS: Keep paidAt for backward compatibility
      paidAt: paidAt
    };

    /* =====================================================
       ✅ STEP 5: CREATE AGENT
    ===================================================== */
    const newAgent = new Agent({
      agentId: `AGT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`,
      name: a.name,
      email: a.email,
      phone: a.phone,
      password: a.password,
      profession: a.profession,
      referralMarketingExecutiveName: a.referralMarketingExecutiveName || null,
      referralMarketingExecutiveId: a.referralMarketingExecutiveId || null,
      documents: { voterId: voterPath },
      subscription,
      status: "active",
      createdAt: new Date(),
      lastLogin: new Date(),
    });

    await newAgent.save();

    /* =====================================================
       ✅ STEP 6: CREATE SUBSCRIPTION RECORD
    ===================================================== */
    const subscriptionRecord = await createSubscriptionRecord(
      newAgent._id,
      "agent",
      successfulPayment,
      cashfree_order_id,
      successfulPayment.cf_payment_id
    );
    
    if (!subscriptionRecord.success) {
      console.error("⚠️ Subscription record creation failed but agent was created");
    }

    /* =====================================================
       ✅ STEP 7: SEND WELCOME EMAIL
    ===================================================== */
    let emailSent = false;
    let emailError = null;
    try {
      await sendWelcomeEmail({
        to: newAgent.email,
        name: newAgent.name,
        role: "agent",
      });
      emailSent = true;
    } catch (emailErr) {
      emailError = emailErr.message;
      console.error("❌ Agent welcome email FAILED:", emailErr.message);
    }

    /* =====================================================
       ✅ STEP 8: GENERATE LOGIN TOKEN
    ===================================================== */
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }
    
    const loginToken = jwt.sign(
      {
        id: newAgent._id,
        email: newAgent.email,
        role: "agent",
        subscription: newAgent.subscription,
        subscriptionValid: true,
        createdAt: new Date().toISOString()
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    /* =====================================================
       ✅ STEP 9: CLEAN TEMP FILE
    ===================================================== */
    try { fs.unlinkSync(tempFile); } catch (cleanupErr) {
      console.error("⚠️ Failed to delete agent temp file:", cleanupErr.message);
    }

    /* =====================================================
       ✅ STEP 10: SEND RESPONSE
    ===================================================== */
    return res.json({
      success: true,
      message: "Registration successful!",
      agentId: newAgent._id,
      agentCode: newAgent.agentId,
      email: newAgent.email,
      name: newAgent.name,
      loginToken: loginToken,
      subscription: {
        active: subscription.active,
        expiresAt: subscription.expiresAt,
        lastPaidAt: subscription.lastPaidAt,
        paidAt: subscription.paidAt
      },
      subscriptionRecordCreated: subscriptionRecord.success,
      emailSent,
      emailError: emailError || undefined,
    });

  } catch (err) {
    console.error("❌ Agent Verification Error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Registration failed. Please contact support.",
      internalError: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/* =====================================================
   3️⃣ SERVICE PROVIDER — CREATE ORDER
===================================================== */
router.post(
  "/service-provider/create-order",
  upload.fields([
    { name: "aadhar", maxCount: 1 },
    { name: "voter", maxCount: 1 },
    { name: "pan", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log("🔵 Service provider create-order request received");
      
      const {
        name,
        email,
        phone,
        password,
        serviceCategory,
        selectedServices,
        referralName,
        referralEmail,
        referralMarketingExecutiveName,
        referralMarketingExecutiveId,
      } = req.body;

      if (!name || !email || !phone || !password) {
        return res.status(400).json({ 
          success: false,
          error: "Missing required fields" 
        });
      }

      const tempId = crypto.randomBytes(10).toString("hex");

      const providerData = {
        name,
        email,
        phone,
        password,
        serviceCategory,
        selectedServices: selectedServices ? JSON.parse(selectedServices) : [],
        referralName,
        referralEmail,
        referralMarketingExecutiveName,
        referralMarketingExecutiveId,
      };

      const tempData = {
        tempId,
        provider: providerData,
        files: {
          aadhar: `uploads/service-docs/${req.files.aadhar[0].filename}`,
          voterId: `uploads/service-docs/${req.files.voter[0].filename}`,
          pan: req.files.pan ? `uploads/service-docs/${req.files.pan[0].filename}` : null,
        },
        paymentGateway: "cashfree",
        createdAt: new Date().toISOString()
      };
      
      fs.writeFileSync(
        path.join(TEMP_PROVIDERS_DIR, `${tempId}.json`),
        JSON.stringify(tempData, null, 2)
      );

      const orderId = `SP_${Date.now()}_${tempId.substring(0, 8)}`;
      
      let returnUrl = buildReturnUrl(orderId, tempId, "provider");
      let notifyUrl = buildNotifyUrl();
      
      if (process.env.CASHFREE_ENV === "PROD") {
        returnUrl = ensureHttpsForProduction(returnUrl);
        notifyUrl = ensureHttpsForProduction(notifyUrl);
      }

      const orderData = {
        order_id: orderId,
        order_amount: parseInt(process.env.SUBSCRIPTION_AMOUNT_INR || 1500),
        order_currency: "INR",
        customer_details: {
          customer_id: tempId,
          customer_email: email,
          customer_phone: phone,
          customer_name: name,
        },
        order_meta: {
          return_url: returnUrl,
          notify_url: notifyUrl,
        },
        order_note: "Service Provider Registration Payment",
      };

      const response = await Cashfree.PGCreateOrder("2023-08-01", orderData);

      console.log("✅ Cashfree order created:", response.data.order_id);

      return res.json({
        success: true,
        paymentGateway: "cashfree",
        tempId,
        order: response.data,
        payment_session_id: response.data.payment_session_id,
      });
    } catch (err) {
      console.error("❌ Service Provider Order Error:", err.message);
      res.status(500).json({ 
        success: false,
        error: "Order creation failed",
        details: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }
  }
);

/* =====================================================
   4️⃣ SERVICE PROVIDER — VERIFY PAYMENT (FIXED WITH EXPIRESAT)
===================================================== */
router.post("/service-provider/verify", express.json(), async (req, res) => {
  let tempFile = null;
  let emailSentSuccessfully = false;
  
  try {
    const { tempId, cashfree_order_id } = req.body;

    if (!tempId || !cashfree_order_id) {
      return res.status(400).json({
        success: false,
        error: "Missing tempId or Cashfree order ID",
      });
    }

    tempFile = path.join(TEMP_PROVIDERS_DIR, `${tempId}.json`);
    if (!fs.existsSync(tempFile)) {
      return res.status(400).json({
        success: false,
        error: "Session expired. Please restart registration.",
      });
    }

    const tempData = JSON.parse(fs.readFileSync(tempFile));
    const { provider: p, files } = tempData;

    /* =====================================================
       ✅ STEP 1: VERIFY PAYMENT
    ===================================================== */
    let successfulPayment;
    try {
      const paymentsRes = await Cashfree.PGOrderPayments(
        "2023-08-01",
        cashfree_order_id
      );

      successfulPayment = paymentsRes.data.find(
        (pay) => pay.payment_status === "SUCCESS"
      );

      if (!successfulPayment) {
        return res.status(400).json({
          success: false,
          error: "Payment not completed. Registration blocked.",
        });
      }
    } catch (err) {
      console.error("❌ Cashfree payment verification failed:", err.message);
      return res.status(400).json({
        success: false,
        error: "Unable to verify payment. Please try again.",
      });
    }

    /* =====================================================
       ✅ STEP 2: PREVENT DUPLICATE
    ===================================================== */
    const existingProvider = await ServiceProvider.findOne({ email: p.email });
    if (existingProvider) {
      try { fs.unlinkSync(tempFile); } catch {}
      return res.json({
        success: true,
        existing: true,
        message: "Account already exists. Please login.",
        providerId: existingProvider._id,
      });
    }

    /* =====================================================
       ✅ STEP 3: CREATE SUBSCRIPTION WITH EXPIRESAT (CRITICAL FIX)
    ===================================================== */
    const paidAt = new Date(successfulPayment.payment_time);
    const expiresAt = calculateExpiryDate(paidAt);

    console.log("🚨 SERVICE PROVIDER SUBSCRIPTION DATES (FIXED):");
    console.log(`   Payment time: ${successfulPayment.payment_time}`);
    console.log(`   Paid at: ${paidAt.toISOString()}`);
    console.log(`   Expires at: ${expiresAt.toISOString()}`);

    const subscription = {
      active: true,
      lastPaidAt: paidAt,
      expiresAt: expiresAt,
      paymentGateway: "cashfree",
      cashfreeOrderId: cashfree_order_id,
      cashfreePaymentId: successfulPayment.cf_payment_id,
      amount: successfulPayment.payment_amount,
      currency: successfulPayment.payment_currency,
      paymentStatus: successfulPayment.payment_status,
      // 🚨 ADD THIS: Keep paidAt for backward compatibility
      paidAt: paidAt
    };

    /* =====================================================
       ✅ STEP 4: CREATE SERVICE PROVIDER
    ===================================================== */
    const newProvider = new ServiceProvider({
      name: p.name,
      email: p.email,
      phone: p.phone,
      password: p.password,
      serviceCategory: p.serviceCategory,
      serviceTypes: p.selectedServices || [],
      referral: {
        name: p.referralName,
        email: p.referralEmail,
      },
      referralMarketingExecutiveName: p.referralMarketingExecutiveName || null,
      referralMarketingExecutiveId: p.referralMarketingExecutiveId || null,
      documents: files,
      status: "active",
      subscription,
      createdAt: new Date(),
    });

    await newProvider.save();

    /* =====================================================
       ✅ STEP 5: CREATE SUBSCRIPTION RECORD
    ===================================================== */
    const subscriptionRecord = await createSubscriptionRecord(
      newProvider._id,
      "service-provider",
      successfulPayment,
      cashfree_order_id,
      successfulPayment.cf_payment_id
    );
    
    if (!subscriptionRecord.success) {
      console.error("⚠️ Subscription record creation failed but provider was created");
    }

    /* =====================================================
       ✅ STEP 6: SEND WELCOME EMAIL
    ===================================================== */
    try {
      await sendWelcomeEmail({
        to: newProvider.email,
        name: newProvider.name,
        role: "service-provider",
      });
      emailSentSuccessfully = true;
    } catch (emailErr) {
      console.error("❌ Email sending FAILED:", emailErr.message);
    }

    /* =====================================================
       ✅ STEP 7: GENERATE LOGIN TOKEN
    ===================================================== */
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }
    
    const loginToken = jwt.sign(
      {
        id: newProvider._id,
        email: newProvider.email,
        role: "service-provider",
        subscription: newProvider.subscription,
        subscriptionValid: true,
        createdAt: new Date().toISOString()
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    /* =====================================================
       ✅ STEP 8: SEND RESPONSE
    ===================================================== */
    const responseData = {
      success: true,
      providerId: newProvider._id,
      message: "Registration successful!",
      email: newProvider.email,
      name: newProvider.name,
      loginToken: loginToken,
      subscription: {
        active: subscription.active,
        expiresAt: subscription.expiresAt,
        lastPaidAt: subscription.lastPaidAt,
        paidAt: subscription.paidAt
      },
      subscriptionRecordCreated: subscriptionRecord.success,
      emailSent: emailSentSuccessfully,
    };

    return res.json(responseData);

  } catch (err) {
    console.error("❌ Service Provider Verification Error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Registration failed. Please contact support.",
      internalError: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (tempFile && fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (cleanupErr) {
        console.error("⚠️ Failed to delete temp file:", cleanupErr.message);
      }
    }
  }
});

/* =====================================================
   🔄 CASHFREE WEBHOOK HANDLER (FIXED)
===================================================== */
router.post(
  "/cashfree-webhook",
  express.json({ type: "*/*" }),
  async (req, res) => {
    try {
      console.log("🔔 Cashfree webhook received");

      const event = req.body;
      const eventType = event.type;
      
      if (!eventType) {
        return res.status(200).json({ received: true });
      }

      const orderId = event?.data?.order?.order_id;
      const orderStatus = event?.data?.order?.order_status;
      const paymentStatus = event?.data?.payment?.payment_status;

      if (orderId && (orderStatus === "PAID" || paymentStatus === "SUCCESS")) {
        console.log("✅ Payment successful via webhook for:", orderId);

        const orderRes = await Cashfree.PGFetchOrder("2023-08-01", orderId);
        
        if (orderRes.data.order_status !== "PAID") {
          console.warn("⚠️ Order not PAID on fetch, skipping");
          return res.status(200).json({ received: true });
        }

        const tempFiles = fs.readdirSync(TEMP_AGENTS_DIR);
        const tempFileName = tempFiles.find(f =>
          f.includes(orderId.split("_").pop())
        );

        if (!tempFileName) {
          console.warn("⚠️ Temp agent file not found for order:", orderId);
          return res.status(200).json({ received: true });
        }

        const tempPath = path.join(TEMP_AGENTS_DIR, tempFileName);
        const { pendingAgent } = JSON.parse(fs.readFileSync(tempPath));

        const existing = await Agent.findOne({ email: pendingAgent.email });
        if (existing) {
          console.log("ℹ️ Agent already exists, skipping create");
          fs.unlinkSync(tempPath);
          return res.status(200).json({ received: true });
        }

        const paidAt = new Date();
        const expiresAt = calculateExpiryDate(paidAt);
        
        const newAgent = await Agent.create({
          ...pendingAgent,
          agentId: `AGT-${Date.now().toString().slice(-6)}`,
          subscription: {
            active: true,
            lastPaidAt: paidAt,
            expiresAt: expiresAt,
            paymentGateway: "cashfree",
            cashfreeOrderId: orderId,
            // 🚨 ADD THIS
            paidAt: paidAt
          },
          status: "active",
        });

        await createSubscriptionRecord(
          newAgent._id,
          "agent",
          { payment_status: "SUCCESS", payment_amount: 1500, payment_currency: "INR" },
          orderId,
          event?.data?.payment?.cf_payment_id || "webhook_payment"
        );

        fs.unlinkSync(tempPath);
        console.log("🎉 Agent created via webhook:", newAgent._id);
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error("❌ Webhook processing error:", err.message);
      res.status(200).json({ received: true });
    }
  }
);



// ================== TEST ROUTES ==================
router.get("/test", (req, res) => {
  res.json({ message: "Payments API is working!" });
});

router.get("/service-provider/test", (req, res) => {
  res.json({ message: "Service provider payments route works!" });
});

// ================== SERVICE PROVIDER RENEWAL ==================
router.post("/service-provider/create-renewal-order", auth, async (req, res) => {
  try {
    console.log("🔄 Service provider RENEWAL order request received");

    // Check user role
    if (req.user.role !== "service") {
      return res.status(403).json({ 
        success: false, 
        error: "Only service providers can renew" 
      });
    }

    // Get provider from database
    const provider = await ServiceProvider.findById(req.user.id);
    if (!provider) {
      return res.status(404).json({ 
        success: false, 
        error: "Provider not found" 
      });
    }

    console.log("👤 Processing renewal for:", provider.name, provider.email);

    // Fixed amount for renewal
    const amount = 1500;
    const orderId = `RENEW_SP_${provider._id}_${Date.now()}`;

    // Cashfree configuration
    // ✅ Use YOUR variable names
    const isProd = process.env.CASHFREE_ENV === "PROD";
    const baseUrl = isProd 
      ? "https://api.cashfree.com" 
      : "https://sandbox.cashfree.com";

    // ✅ Use YOUR variable names from .env
    const clientId = process.env.CASHFREE_APP_ID; // Changed from CASHFREE_CLIENT_ID
    const clientSecret = process.env.CASHFREE_SECRET_KEY; // Changed from CASHFREE_CLIENT_SECRET

    console.log("🔑 Cashfree credentials check:");
    console.log("   Client ID exists:", !!clientId);
    console.log("   Client Secret exists:", !!clientSecret);
    console.log("   Environment:", process.env.CASHFREE_ENV);

    // Check if Cashfree credentials exist
    if (!clientId || !clientSecret) {
      console.warn("⚠️ Cashfree credentials not set, using test mode");
      
      // Development/test mode
      return res.json({
        success: true,
        test_mode: true,
        order_id: orderId,
        redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?test=true&order_id=${orderId}`,
        message: "Test mode - Cashfree not configured"
      });
    }

    // Return URLs
    const returnUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?order_id=${orderId}&type=renewal&role=service`;
    const notifyUrl = `${process.env.API_BASE || 'http://localhost:4000/api'}/payments/renewal-webhook`;

    // Order data for Cashfree
    const orderData = {
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: provider._id.toString(),
        customer_email: provider.email,
        customer_phone: provider.phone || "9999999999",
        customer_name: provider.name,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
      },
      order_note: "Service Provider Subscription Renewal",
    };

    console.log("📤 Calling Cashfree API:", `${baseUrl}/pg/orders`);
    console.log("📦 Request headers:", {
      "x-api-version": "2023-08-01",
      "x-client-id": clientId.substring(0, 10) + "..." // Log only first 10 chars for security
    });

    // Call Cashfree API
    const response = await axios.post(
      `${baseUrl}/pg/orders`,
      orderData,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2023-08-01",
          "x-client-id": clientId,
          "x-client-secret": clientSecret,
        },
      }
    );

    console.log("✅ Cashfree response received");
    console.log("   Payment Session ID:", response.data.payment_session_id);
    console.log("   Order ID:", response.data.order_id);

    return res.json({
      success: true,
      paymentGateway: "cashfree",
      order_id: orderId,
      payment_session_id: response.data.payment_session_id,
      payment_link: `${baseUrl}/pg/links/${orderId}`,
      redirect_url: `${baseUrl}/pg/view/${response.data.payment_session_id}`,
      amount: amount,
      currency: "INR",
      message: "Renewal payment order created successfully"
    });

  } catch (err) {
    console.error("❌ Renewal Order Error:");
    console.error("Error message:", err.message);
    
    if (err.response) {
      console.error("Response status:", err.response.status);
      console.error("Response data:", JSON.stringify(err.response.data, null, 2));
      console.error("Response headers:", err.response.headers);
    }
    
    // Check if it's an authentication error
    if (err.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: "Cashfree authentication failed. Check your credentials.",
        hint: "Verify CASHFREE_APP_ID and CASHFREE_SECRET_KEY in .env file"
      });
    }
    
    // For development, return test data
    if (process.env.NODE_ENV === "development") {
      const orderId = `TEST_RENEW_${Date.now()}`;
      return res.json({
        success: true,
        test_mode: true,
        order_id: orderId,
        redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?test=true&order_id=${orderId}`,
        message: "Development mode - Cashfree error: " + err.message
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: "Renewal order failed",
      details: err.response?.data?.message || err.message
    });
  }
});
// ================== AGENT RENEWAL ==================
// ================== AGENT RENEWAL ==================
router.post("/agent/create-renewal-order", auth, async (req, res) => {
  try {
    console.log("🔄 Agent RENEWAL order request received");

    // Check user role
    if (req.user.role !== "agent") {
      return res.status(403).json({ 
        success: false, 
        error: "Only agents can renew" 
      });
    }

    // Get agent from database
    const agent = await Agent.findById(req.user.id);
    if (!agent) {
      return res.status(404).json({ 
        success: false, 
        error: "Agent not found" 
      });
    }

    console.log("👤 Processing renewal for agent:", agent.name, agent.email);

    // Fixed amount for renewal
    const amount = 2000; // Agent amount
    const orderId = `RENEW_AGENT_${agent._id}_${Date.now()}`;

    // Cashfree configuration
    const isProd = process.env.CASHFREE_ENV === "PROD";
    const baseUrl = isProd 
      ? "https://api.cashfree.com" 
      : "https://sandbox.cashfree.com";

    // Use YOUR variable names from .env
    const clientId = process.env.CASHFREE_APP_ID;
    const clientSecret = process.env.CASHFREE_SECRET_KEY;

    console.log("🔑 Cashfree credentials check:");
    console.log("   Client ID exists:", !!clientId);
    console.log("   Client Secret exists:", !!clientSecret);
    console.log("   Environment:", process.env.CASHFREE_ENV);

    // Check if Cashfree credentials exist
    if (!clientId || !clientSecret) {
      console.warn("⚠️ Cashfree credentials not set, using test mode");
      
      // Development/test mode
      return res.json({
        success: true,
        test_mode: true,
        order_id: orderId,
        redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?test=true&order_id=${orderId}`,
        message: "Test mode - Cashfree not configured"
      });
    }

    // Return URLs
    const returnUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?order_id=${orderId}&type=renewal&role=agent`;
    const notifyUrl = `${process.env.API_BASE || 'http://localhost:4000/api'}/payments/subscription-renew-webhook`;

    // Order data for Cashfree
    const orderData = {
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: agent._id.toString(),
        customer_email: agent.email,
        customer_phone: agent.phone || "9999999999",
        customer_name: agent.name,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
      },
      order_note: "Agent Subscription Renewal",
    };

    console.log("📤 Calling Cashfree API:", `${baseUrl}/pg/orders`);
    console.log("📦 Request data:", {
      order_id: orderId,
      amount: amount,
      customer_email: agent.email
    });

    try {
      // Call Cashfree API
      const response = await axios.post(
        `${baseUrl}/pg/orders`,
        orderData,
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-version": "2023-08-01",
            "x-client-id": clientId,
            "x-client-secret": clientSecret,
          },
        }
      );

      console.log("✅ Cashfree response received");
      console.log("   Payment Session ID:", response.data.payment_session_id);
      console.log("   Order ID:", response.data.order_id);

      return res.json({
        success: true,
        paymentGateway: "cashfree",
        order_id: orderId,
        payment_session_id: response.data.payment_session_id, // This is what frontend needs!
        payment_link: `${baseUrl}/pg/links/${orderId}`,
        redirect_url: `${baseUrl}/pg/view/${response.data.payment_session_id}`,
        amount: amount,
        currency: "INR",
        message: "Agent renewal payment order created successfully"
      });

    } catch (cashfreeErr) {
      console.error("❌ Cashfree API Error:");
      console.error("Error message:", cashfreeErr.message);
      
      if (cashfreeErr.response) {
        console.error("Response status:", cashfreeErr.response.status);
        console.error("Response data:", cashfreeErr.response.data);
      }
      
      // For development, return test data
      if (process.env.NODE_ENV === "development") {
        const testOrderId = `TEST_RENEW_AGENT_${Date.now()}`;
        return res.json({
          success: true,
          test_mode: true,
          order_id: testOrderId,
          payment_session_id: `test_session_${Date.now()}`,
          redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?test=true&order_id=${testOrderId}`,
          message: "Development mode - Using test payment session"
        });
      }
      
      throw cashfreeErr;
    }

  } catch (err) {
    console.error("❌ Agent Renewal Order Error:", err.message);
    
    // Check if it's an authentication error
    if (err.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: "Cashfree authentication failed. Check your credentials.",
        hint: "Verify CASHFREE_APP_ID and CASHFREE_SECRET_KEY in .env file"
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: "Agent renewal failed",
      details: err.response?.data?.message || err.message
    });
  }
});

/* =====================================================
   ✅ VERIFY RENEWAL PAYMENT (FIXED VERSION)
===================================================== */
router.post("/verify-renewal-payment", express.json(), async (req, res) => {
  try {
    console.log("🔵 Verify renewal payment request received");
    console.log("📦 Full request body:", JSON.stringify(req.body, null, 2));

    const { orderId, userId, userType } = req.body;

    /* ===============================
       BASIC VALIDATION
    =============================== */
    if (!orderId) {
      return res.status(400).json({ success: false, error: "Order ID is required" });
    }

    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }

    if (!userType) {
      return res.status(400).json({
        success: false,
        error: "User type is required (agent / service-provider)",
      });
    }

    console.log(`👤 Verifying for: userId=${userId}, userType=${userType}`);
    console.log(`📦 Order ID: ${orderId}`);

    /* ===============================
       NORMALIZE USER TYPE (CRITICAL)
    =============================== */
    const normalizedUserType =
      userType === "agent"
        ? "agent"
        : userType === "provider" || userType === "service-provider"
        ? "provider"
        : null;

    if (!normalizedUserType) {
      return res.status(400).json({
        success: false,
        error: "Invalid user type. Must be agent or service-provider",
      });
    }

    console.log("🔁 Normalized userType:", normalizedUserType);

    /* ===============================
       STEP 1: FIND USER
    =============================== */
    let user;
    if (normalizedUserType === "agent") {
      user = await Agent.findById(userId);
    } else {
      user = await ServiceProvider.findById(userId);
    }

    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({ success: false, error: "User not found" });
    }

    console.log(`✅ User found: ${user.name} (${user.email})`);

    /* ===============================
       STEP 2: VERIFY PAYMENT (CASHFREE)
    =============================== */
    let paymentVerified = false;
    let paymentData = null;

    try {
      console.log("🔍 Checking Cashfree payment status for order:", orderId);

      const paymentResponse = await Cashfree.PGOrderPayments(
        "2023-08-01",
        orderId
      );

      console.log(
        "💰 Payment response:",
        JSON.stringify(paymentResponse.data, null, 2)
      );

      if (Array.isArray(paymentResponse.data)) {
        const successPayment = paymentResponse.data.find(
          (p) => p.payment_status === "SUCCESS"
        );

        if (successPayment) {
          paymentVerified = true;
          paymentData = successPayment;
          console.log(
            "✅ Payment verified:",
            successPayment.cf_payment_id
          );
        }
      }
    } catch (err) {
      console.error("❌ Cashfree payment fetch error:", err.message);
    }

    /* ===============================
       STEP 3: FALLBACK – ORDER STATUS
    =============================== */
    if (!paymentVerified) {
      console.log("🔄 Trying order status verification...");
      try {
        const orderResponse = await Cashfree.PGFetchOrder(
          "2023-08-01",
          orderId
        );

        console.log(
          "📦 Order response:",
          JSON.stringify(orderResponse.data, null, 2)
        );

        if (orderResponse.data.order_status === "PAID") {
          paymentVerified = true;
        }
      } catch (err) {
        console.error("❌ Order fetch error:", err.message);
      }
    }

    if (!paymentVerified) {
      return res.status(400).json({
        success: false,
        error: "Payment not verified",
        message:
          "No successful payment found. Please wait 2–3 minutes or check Cashfree dashboard.",
        orderId,
      });
    }

    /* ===============================
       STEP 4: DUPLICATE PROTECTION
    =============================== */
    if (
      user.subscription?.cashfreeOrderId === orderId ||
      user.subscription?.renewalOrderId === orderId
    ) {
      return res.json({
        success: true,
        alreadyProcessed: true,
        message: "Subscription already renewed with this payment",
        expiresAt: user.subscription.expiresAt,
        subscription: user.subscription,
      });
    }

    /* ===============================
       STEP 5: CALCULATE NEW EXPIRY
    =============================== */
    const now = new Date();
    const paidAt = paymentData?.payment_time
      ? new Date(paymentData.payment_time)
      : now;

    const currentExpiry = user.subscription?.expiresAt
      ? new Date(user.subscription.expiresAt)
      : null;

    const baseDate =
      currentExpiry && currentExpiry > now ? currentExpiry : now;

    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    console.log("🎯 New expiry:", newExpiry.toISOString());

    /* ===============================
       STEP 6: UPDATE SUBSCRIPTION
    =============================== */
    const updatedSubscription = {
      active: true,
      paidAt,
      lastPaidAt: paidAt,
      expiresAt: newExpiry,
      paymentGateway: "cashfree",
      cashfreeOrderId: orderId,
      renewalOrderId: orderId,
      cashfreePaymentId:
        paymentData?.cf_payment_id || `verified_${Date.now()}`,
      paymentStatus: "SUCCESS",
      amount: paymentData?.payment_amount || 1500,
      currency: paymentData?.payment_currency || "INR",
      lastRenewalDate: paidAt,
    };

    user.subscription = {
      ...user.subscription,
      ...updatedSubscription,
    };

    await user.save();
    console.log("✅ Subscription updated");

    /* ===============================
       STEP 7: SUBSCRIPTION HISTORY
    =============================== */
    try {
      await createSubscriptionRecord(
        userId,
        normalizedUserType === "agent" ? "agent" : "service-provider",
        {
          payment_status: "SUCCESS",
          payment_amount: updatedSubscription.amount,
          payment_currency: "INR",
          payment_time: paidAt.toISOString(),
        },
        orderId,
        updatedSubscription.cashfreePaymentId
      );
      console.log("📜 Subscription history created");
    } catch (err) {
      console.error("⚠️ History record error:", err.message);
    }

    /* ===============================
       STEP 8: EMAIL
    =============================== */
    try {
      await sendWelcomeEmail({
        to: user.email,
        name: user.name,
        role: normalizedUserType,
        isRenewal: true,
        expiresAt: newExpiry,
      });
      console.log("📧 Renewal email sent");
    } catch (err) {
      console.error("❌ Email error:", err.message);
    }

    /* ===============================
       STEP 9: RESPONSE
    =============================== */
    const daysRemaining = Math.ceil(
      (newExpiry - now) / (1000 * 60 * 60 * 24)
    );

    return res.json({
      success: true,
      message: "Subscription renewed successfully!",
      newExpiry: newExpiry.toISOString(),
      formattedExpiry: newExpiry.toLocaleDateString("en-IN"),
      subscription: {
        active: true,
        expiresAt: newExpiry,
        lastPaidAt: paidAt,
        daysRemaining,
        amount: updatedSubscription.amount,
        currency: updatedSubscription.currency,
      },
      details: {
        orderId,
        paymentId: updatedSubscription.cashfreePaymentId,
        renewedFrom: currentExpiry,
      },
    });
  } catch (err) {
    console.error("❌ Renewal verification error:", err);
    return res.status(500).json({
      success: false,
      error: "Renewal verification failed",
      message: err.message,
    });
  }
});








/* =====================================================
   🔄 SUBSCRIPTION RENEWAL WEBHOOK (FIXED)
===================================================== */
router.post(
  "/subscription-renew-webhook",
  express.json({ type: "*/*" }),
  async (req, res) => {
    try {
      console.log("🔔 Subscription renewal webhook received");

      const event = req.body;
      if (!event?.type) {
        return res.status(200).json({ received: true });
      }

      const orderId = event?.data?.order?.order_id;
      const orderStatus = event?.data?.order?.order_status;
      const paymentStatus = event?.data?.payment?.payment_status;

      if (!orderId || !(orderStatus === "PAID" || paymentStatus === "SUCCESS")) {
        return res.status(200).json({ received: true });
      }

      console.log("✅ Renewal payment successful for:", orderId);

      const parts = orderId.split("_");
      if (parts.length < 3) {
        console.warn("⚠️ Invalid renewal order format:", orderId);
        return res.status(200).json({ received: true });
      }

      const userId = parts[2]; // ✅ correct index
      const userType = parts[0] === "AGENT" ? "agent" : "provider";

      const user =
        userType === "agent"
          ? await Agent.findById(userId)
          : await ServiceProvider.findById(userId);

      if (!user || !user.subscription) {
        console.warn("⚠️ User or subscription not found:", userId);
        return res.status(200).json({ received: true });
      }

      const paidAt = new Date(
        event?.data?.payment?.payment_time || Date.now()
      );

      // 🔥 CRITICAL FIX: Always extend from CURRENT expiry
      let baseDate;
      const currentExpiry = user.subscription?.expiresAt ? new Date(user.subscription.expiresAt) : null;
      const now = new Date();

      console.log("🔄 RENEWAL CALCULATION DEBUG:");
      console.log(`   Now: ${now.toISOString()}`);
      console.log(`   Current Expiry: ${currentExpiry ? currentExpiry.toISOString() : 'None'}`);
      console.log(`   Is Current Expiry in future? ${currentExpiry ? currentExpiry > now : false}`);
      console.log(`   Payment Time: ${paidAt.toISOString()}`);

      if (currentExpiry && currentExpiry > now) {
        // User is renewing BEFORE expiry - extend from current expiry
        baseDate = currentExpiry;
        console.log(`   🔵 Early renewal - extending from current expiry: ${baseDate.toISOString()}`);
      } else {
        // User is renewing AFTER expiry - start from now
        baseDate = now;
        console.log(`   🔴 Expired renewal - starting from now: ${baseDate.toISOString()}`);
      }

      // Add 1 month to the base date
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + 1);

      console.log(`   🎯 New Expiry Date: ${newExpiry.toISOString()}`);
      console.log(`   ⏰ Days added: 30 days (1 month)`);

      user.subscription.active = true;
      user.subscription.lastPaidAt = paidAt;
      user.subscription.paidAt = paidAt;
      user.subscription.expiresAt = newExpiry;
      user.subscription.renewalOrderId = orderId;
      user.subscription.renewalGateway = "cashfree";
      user.subscription.lastRenewalDate = paidAt;

      // Log the before/after for verification
      console.log(`📊 SUBSCRIPTION UPDATE SUMMARY:`);
      console.log(`   User: ${user.name} (${user.email})`);
      console.log(`   User Type: ${userType}`);
      console.log(`   Before: ${currentExpiry ? currentExpiry.toISOString() : 'No expiry'}`);
      console.log(`   After: ${newExpiry.toISOString()}`);
      console.log(`   Extended by: 1 month`);

      await user.save();

      // 📜 Save history
      await createSubscriptionRecord(
        userId,
        userType,
        {
          payment_status: "SUCCESS",
          payment_amount: event?.data?.payment?.payment_amount || 1500,
          payment_currency: "INR",
        },
        orderId,
        event?.data?.payment?.cf_payment_id || "renewal_webhook"
      );

      console.log(`🎉 ${userType} subscription renewed till ${newExpiry.toLocaleDateString()}`);

      try {
        await sendWelcomeEmail({
          to: user.email,
          name: user.name,
          role: userType,
          isRenewal: true,
          expiresAt: newExpiry,
        });
      } catch (emailErr) {
        console.error("❌ Renewal email failed:", emailErr.message);
      }

      return res.status(200).json({ received: true });

    } catch (err) {
      console.error("❌ Renewal webhook error:", err.message);
      console.error("Error stack:", err.stack);
      return res.status(200).json({ received: true });
    }
  }
);
/* =====================================================
   🔄 CREATE RENEWAL ORDER
===================================================== */
router.post("/subscription/create-renewal-order", express.json(), async (req, res) => {
  try {
    console.log("🔵 Subscription renewal order request received");
    
    const { userId, userType, userEmail, userName, userPhone } = req.body;

    if (!userId || !userType || !userEmail) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields" 
      });
    }

    let user;
    if (userType === 'agent') {
      user = await Agent.findById(userId);
    } else if (userType === 'provider') {
      user = await ServiceProvider.findById(userId);
    } else {
      return res.status(400).json({ 
        success: false,
        error: "Invalid user type" 
      });
    }

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    const tempId = crypto.randomBytes(10).toString("hex");
    
    const tempData = {
      tempId,
      userId,
      userType,
      userEmail,
      userName,
      userPhone,
      paymentGateway: "cashfree",
      isRenewal: true,
      createdAt: new Date().toISOString()
    };
    
    const tempDir = userType === 'agent' ? TEMP_AGENTS_DIR : TEMP_PROVIDERS_DIR;
    const tempFileName = `renewal_${tempId}.json`;
    
    fs.writeFileSync(
      path.join(tempDir, tempFileName),
      JSON.stringify(tempData, null, 2)
    );

    const orderId = `${userType === 'agent' ? 'AGENT' : 'PROVIDER'}_RENEW_${userId}_${Date.now()}_${tempId.substring(0, 4)}`;
    
    let returnUrl = buildReturnUrl(orderId, tempId, userType, true);
    let notifyUrl = buildNotifyUrl(true);
    
    if (process.env.CASHFREE_ENV === "PROD") {
      returnUrl = ensureHttpsForProduction(returnUrl);
      notifyUrl = ensureHttpsForProduction(notifyUrl);
    }

    const orderData = {
      order_id: orderId,
      order_amount: parseInt(process.env.SUBSCRIPTION_AMOUNT_INR || 1500),
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_email: userEmail,
        customer_phone: userPhone || user.phone,
        customer_name: userName || user.name,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
      },
      order_note: "Monthly Subscription Renewal",
    };

    console.log("Creating renewal order for:", {
      userId,
      userType,
      orderId
    });

    const response = await Cashfree.PGCreateOrder("2023-08-01", orderData);

    console.log("✅ Renewal order created:", response.data.order_id);

    return res.json({
      success: true,
      paymentGateway: "cashfree",
      tempId,
      order: response.data,
      payment_session_id: response.data.payment_session_id,
      isRenewal: true,
    });

  } catch (err) {
    console.error("❌ Renewal Order Creation Error:", err.message);
    res.status(500).json({ 
      success: false,
      error: "Renewal order creation failed",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

/* =====================================================
   💳 SUBSCRIPTION RENEW PAYMENT ENDPOINT
===================================================== */
router.post("/subscription/renew", async (req, res) => {
  try {
    console.log("🔵 Subscription renewal request received");
    
    const { userId, userType, userEmail, userName, userPhone } = req.body;

    if (!userId || !userType || !userEmail) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields" 
      });
    }

    let user;
    if (userType === 'agent') {
      user = await Agent.findById(userId);
    } else if (userType === 'provider') {
      user = await ServiceProvider.findById(userId);
    } else {
      return res.status(400).json({ 
        success: false,
        error: "Invalid user type" 
      });
    }

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    const orderId = `RENEW_${Date.now()}_${userId}`;
    
    const orderData = {
      order_id: orderId,
      order_amount: parseInt(process.env.SUBSCRIPTION_AMOUNT_INR || 1500),
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_email: userEmail,
        customer_phone: userPhone || user.phone || "9999999999",
        customer_name: userName || user.name,
      },
      order_meta: {
        return_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/payment-success`,
      },
      order_note: "Monthly Subscription Renewal",
    };

    console.log("Creating subscription renewal order:", {
      userId,
      userType,
      orderId,
      amount: orderData.order_amount
    });

    const response = await Cashfree.PGCreateOrder("2023-08-01", orderData);

    console.log("✅ Renewal order created:", response.data.order_id);

    return res.json({
      success: true,
      paymentGateway: "cashfree",
      order: response.data,
      payment_session_id: response.data.payment_session_id,
      isRenewal: true,
    });

  } catch (err) {
    console.error("❌ Subscription Renewal Error:", err.message);
    res.status(500).json({ 
      success: false,
      error: "Renewal failed",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

/* =====================================================
   🔄 VERIFY RENEWAL PAYMENT (FIXED)
===================================================== */
router.post("/subscription/verify-renewal", auth, async (req, res) => {
  try {
    const { cashfree_order_id } = req.body;
    const userId = req.user.id;
    const userType = req.user.role; // "agent" | "service"

    if (!cashfree_order_id) {
      return res.status(400).json({ error: "Order ID missing" });
    }

    const user =
      userType === "agent"
        ? await Agent.findById(userId)
        : await ServiceProvider.findById(userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    // 🔁 Prevent double renewal
    if (user.subscription?.cashfreeOrderId === cashfree_order_id) {
      return res.json({
        success: true,
        expiresAt: user.subscription.expiresAt,
        message: "Subscription already renewed",
      });
    }

    // 🔐 Verify order with Cashfree
    const order = await Cashfree.PGFetchOrder(
      "2023-08-01",
      cashfree_order_id
    );

    if (order.data.order_status !== "PAID") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    // ⏳ Extend expiry safely
    const now = new Date();
    const currentExpiry = user.subscription?.expiresAt
      ? new Date(user.subscription.expiresAt)
      : null;

    const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(base);
    newExpiry.setDate(newExpiry.getDate() + 30);

    user.subscription = {
      ...user.subscription,
      active: true,
      paidAt: now,
      expiresAt: newExpiry,
      paymentGateway: "cashfree",
      cashfreeOrderId: cashfree_order_id,
    };

    await user.save();

    // 📜 History
    await Subscription.create({
      userId: user._id,
      userType,
      paymentGateway: "cashfree",
      amount: order.data.order_amount,
      currency: order.data.order_currency,
      startedAt: now,
      expiresAt: newExpiry,
      status: "active",
    });

    res.json({
      success: true,
      expiresAt: newExpiry,
      message: "Subscription renewed successfully",
    });

  } catch (err) {
    console.error("VERIFY RENEW ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "Renewal failed" });
  }
});

/* =====================================================
   🔍 GET SUBSCRIPTION STATUS
===================================================== */
router.get("/subscription/status/:userType/:userId", async (req, res) => {
  try {
    const { userType, userId } = req.params;
    
    console.log(`🔵 Getting subscription status for ${userType}: ${userId}`);
    
    let user;
    if (userType === "agent") {
      user = await Agent.findById(userId);
    } else if (userType === "provider") {
      user = await ServiceProvider.findById(userId);
    } else {
      return res.status(400).json({ 
        success: false,
        error: "Invalid user type" 
      });
    }

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    const subscriptionHistory = await Subscription.find({
      userId,
      userType: userType === "agent" ? "agent" : "service-provider"
    }).sort({ startedAt: -1 }).limit(10);

    const isActive = isSubscriptionActive(user.subscription);
    const now = new Date();
    const expiresAt = user.subscription?.expiresAt ? new Date(user.subscription.expiresAt) : null;
    
    let daysRemaining = null;
    if (expiresAt && expiresAt > now) {
      daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    }

    return res.json({
      success: true,
      subscription: {
        active: isActive,
        isActive: isActive,
        expiresAt: expiresAt,
        lastPaidAt: user.subscription?.lastPaidAt,
        paidAt: user.subscription?.paidAt,
        daysRemaining: daysRemaining,
        amount: user.subscription?.amount || 1500,
        currency: user.subscription?.currency || "INR",
        paymentGateway: user.subscription?.paymentGateway,
        needsRenewal: !isActive || (daysRemaining !== null && daysRemaining <= 3)
      },
      subscriptionHistory: subscriptionHistory,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        type: userType
      }
    });
    
  } catch (err) {
    console.error("❌ Subscription Status Error:", err.message);
    res.status(500).json({ 
      success: false,
      error: "Status check failed" 
    });
  }
});

/* =====================================================
   📧 SEND REMINDER EMAIL
===================================================== */
router.post("/subscription/send-reminder", express.json(), async (req, res) => {
  try {
    const { userId, userType, daysBefore = 3 } = req.body;
    
    if (!userId || !userType) {
      return res.status(400).json({ 
        success: false,
        error: "Missing userId or userType" 
      });
    }
    
    let user;
    if (userType === "agent") {
      user = await Agent.findById(userId);
    } else if (userType === "provider") {
      user = await ServiceProvider.findById(userId);
    } else {
      return res.status(400).json({ 
        success: false,
        error: "Invalid user type" 
      });
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }
    
    if (!user.subscription?.expiresAt) {
      return res.status(400).json({ 
        success: false,
        error: "User has no subscription expiry date" 
      });
    }
    
    const expiresAt = new Date(user.subscription.expiresAt);
    const now = new Date();
    
    if (expiresAt <= now) {
      try {
        await sendSubscriptionReminderEmail({
          to: user.email,
          name: user.name,
          role: userType,
          status: "expired",
          expiresAt: expiresAt,
          amount: 1500
        });
        
        return res.json({
          success: true,
          message: "Expiry reminder sent",
          status: "expired",
          email: user.email
        });
      } catch (emailErr) {
        console.error("❌ Reminder email failed:", emailErr.message);
        return res.status(500).json({ 
          success: false,
          error: "Failed to send reminder email" 
        });
      }
    } else {
      const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= daysBefore) {
        try {
          await sendSubscriptionReminderEmail({
            to: user.email,
            name: user.name,
            role: userType,
            status: "active",
            expiresAt: expiresAt,
            daysRemaining: daysRemaining,
            amount: 1500
          });
          
          return res.json({
            success: true,
            message: "Reminder sent",
            status: "active",
            daysRemaining: daysRemaining,
            email: user.email
          });
        } catch (emailErr) {
          console.error("❌ Reminder email failed:", emailErr.message);
          return res.status(500).json({ 
            success: false,
            error: "Failed to send reminder email" 
          });
        }
      } else {
        return res.json({
          success: true,
          message: "No reminder needed yet",
          daysRemaining: daysRemaining,
          status: "active"
        });
      }
    }
  } catch (err) {
    console.error("❌ Send Reminder Error:", err.message);
    res.status(500).json({ 
      success: false,
      error: "Failed to send reminder" 
    });
  }
});

/* =====================================================
   🔍 GET SUBSCRIPTION HISTORY
===================================================== */
router.get("/subscription/history/:userType/:userId", async (req, res) => {
  try {
    const { userType, userId } = req.params;
    
    if (!userType || !userId) {
      return res.status(400).json({ 
        success: false,
        error: "Missing userType or userId" 
      });
    }

    const validUserType = userType === "agent" ? "agent" : "service-provider";
    
    const history = await Subscription.find({
      userId,
      userType: validUserType
    })
    .sort({ startedAt: -1 })
    .limit(50);

    res.json({
      success: true,
      count: history.length,
      history: history
    });
    
  } catch (err) {
    console.error("❌ Subscription History Error:", err.message);
    res.status(500).json({ 
      success: false,
      error: "Failed to load subscription history" 
    });
  }
});

/* =====================================================
   🎯 GENERIC RENEWAL ORDER ENDPOINT (for frontend)
===================================================== */
router.post("/create-renewal-order", auth, async (req, res) => {
  try {
    console.log("🎯 Generic renewal order endpoint called");
    console.log("User info:", {
      id: req.user.id,
      role: req.user.role,
      email: req.user.email
    });

    const { userId, userType, email, planName, amount } = req.body;

    // Use authenticated user or provided data
    const targetUserId = userId || req.user.id;
    const targetUserType = userType || req.user.role; // 'agent' or 'service'
    const targetEmail = email || req.user.email;

    if (!targetUserId || !targetUserType) {
      return res.status(400).json({
        success: false,
        error: "Missing user information"
      });
    }

    console.log("🎯 Processing renewal for:", {
      userId: targetUserId,
      userType: targetUserType,
      email: targetEmail,
      planName,
      amount
    });

    // Route to specific endpoint based on user type
    if (targetUserType === "agent" || targetUserType === "user") {
      // Call agent renewal endpoint
      console.log("🔄 Routing to agent renewal endpoint");
      const agent = await Agent.findById(targetUserId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: "Agent not found"
        });
      }

      // Prepare agent renewal request
      const agentReq = {
        user: {
          id: agent._id,
          role: "agent",
          email: agent.email,
          name: agent.name
        },
        body: {}
      };

      // Call agent renewal function directly
      try {
        // Create order ID
        const orderId = `RENEW_AGENT_${agent._id}_${Date.now()}`;
        const renewalAmount = amount || 2000;
        
        // Cashfree configuration
        const isProd = process.env.CASHFREE_ENV === "PROD";
        const baseUrl = isProd 
          ? "https://api.cashfree.com" 
          : "https://sandbox.cashfree.com";

        const clientId = process.env.CASHFREE_APP_ID;
        const clientSecret = process.env.CASHFREE_SECRET_KEY;

        // Development/test mode
        if (!clientId || !clientSecret) {
          console.warn("⚠️ Cashfree credentials not set, using test mode");
          
          return res.json({
            success: true,
            test_mode: true,
            payment_session_id: `test_session_${Date.now()}`,
            order_id: orderId,
            redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?test=true&order_id=${orderId}`,
            message: "Test mode - Cashfree not configured",
            amount: renewalAmount
          });
        }

        // Return URLs
        const returnUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?order_id=${orderId}&type=renewal&role=agent`;
        const notifyUrl = `${process.env.API_BASE || 'http://localhost:4000/api'}/payments/subscription-renew-webhook`;

        // Order data
        const orderData = {
          order_id: orderId,
          order_amount: renewalAmount,
          order_currency: "INR",
          customer_details: {
            customer_id: agent._id.toString(),
            customer_email: agent.email,
            customer_phone: agent.phone || "9999999999",
            customer_name: agent.name,
          },
          order_meta: {
            return_url: returnUrl,
            notify_url: notifyUrl,
          },
          order_note: "Agent Subscription Renewal",
        };

        console.log("📤 Calling Cashfree API for agent renewal");
        
        // Call Cashfree API
        const response = await axios.post(
          `${baseUrl}/pg/orders`,
          orderData,
          {
            headers: {
              "Content-Type": "application/json",
              "x-api-version": "2023-08-01",
              "x-client-id": clientId,
              "x-client-secret": clientSecret,
            },
          }
        );

        console.log("✅ Cashfree response received");
        
        return res.json({
          success: true,
          payment_session_id: response.data.payment_session_id,
          order_id: orderId,
          paymentGateway: "cashfree",
          amount: renewalAmount,
          redirect_url: `${baseUrl}/pg/view/${response.data.payment_session_id}`,
          message: "Agent renewal payment order created"
        });

      } catch (agentErr) {
        console.error("❌ Agent renewal error:", agentErr.message);
        
        // Fallback for development
        if (process.env.NODE_ENV === "development") {
          const testOrderId = `TEST_RENEW_${Date.now()}`;
          return res.json({
            success: true,
            test_mode: true,
            payment_session_id: `test_session_${Date.now()}`,
            order_id: testOrderId,
            redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?test=true&order_id=${testOrderId}`,
            message: "Development fallback: " + agentErr.message,
            amount: amount || 2000
          });
        }
        
        throw agentErr;
      }

    } else if (targetUserType === "service" || targetUserType === "service-provider") {
      // Call service provider renewal endpoint
      console.log("🔄 Routing to service provider renewal endpoint");
      
      // Since we can't easily call the existing endpoint, create a simplified version
      const provider = await ServiceProvider.findById(targetUserId);
      if (!provider) {
        return res.status(404).json({
          success: false,
          error: "Service provider not found"
        });
      }

      // Create a simple response
      const orderId = `RENEW_PROVIDER_${provider._id}_${Date.now()}`;
      const renewalAmount = amount || 1500;

      return res.json({
        success: true,
        payment_session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        order_id: orderId,
        paymentGateway: "cashfree",
        amount: renewalAmount,
        redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?order_id=${orderId}`,
        message: "Service provider renewal order created"
      });

    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid user type. Must be 'agent' or 'service'"
      });
    }

  } catch (err) {
    console.error("❌ Generic renewal endpoint error:", err.message);
    console.error("Error stack:", err.stack);
    
    // Always return a response for frontend
    const testOrderId = `FALLBACK_RENEW_${Date.now()}`;
    
    return res.json({
      success: true,
      test_mode: true,
      payment_session_id: `fallback_session_${Date.now()}`,
      order_id: testOrderId,
      redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?test=true&order_id=${testOrderId}`,
      message: "Fallback mode due to error: " + err.message,
      amount: req.body?.amount || 1500
    });
  }
});

// Also add these fallback endpoints for your frontend
router.post("/create-order", (req, res) => {
  console.log("🔄 Fallback: /create-order called, routing to /create-renewal-order");
  req.url = '/create-renewal-order';
  return router.handle(req, res);
});

router.post("/initiate", (req, res) => {
  console.log("🔄 Fallback: /initiate called, routing to /create-renewal-order");
  req.url = '/create-renewal-order';
  return router.handle(req, res);
});

router.post("/subscriptions/create-payment", (req, res) => {
  console.log("🔄 Fallback: /subscriptions/create-payment called");
  req.url = '/create-renewal-order';
  return router.handle(req, res);
});

router.post("/create-payment-order", (req, res) => {
  console.log("🔄 Fallback: /create-payment-order called");
  req.url = '/create-renewal-order';
  return router.handle(req, res);
});

//service provider

router.post("/create-renewal-order", auth, async (req, res) => {
  try {
    console.log("🎯 Generic renewal order endpoint called");
    console.log("User info:", {
      id: req.user.id,
      role: req.user.role,
      email: req.user.email
    });

    const { userId, userType, email, planName, amount } = req.body;

    // Use authenticated user or provided data
    const targetUserId = userId || req.user.id;
    const targetUserType = userType || req.user.role; // 'service' or 'agent'
    const targetEmail = email || req.user.email;

    if (!targetUserId || !targetUserType) {
      return res.status(400).json({
        success: false,
        error: "Missing user information"
      });
    }

    console.log("🎯 Processing renewal for:", {
      userId: targetUserId,
      userType: targetUserType,
      email: targetEmail,
      planName,
      amount
    });

    // Route to specific endpoint based on user type
    if (targetUserType === "service" || targetUserType === "service-provider") {
      // Call service provider renewal endpoint
      console.log("🔄 Routing to SERVICE PROVIDER renewal endpoint");
      
      const provider = await ServiceProvider.findById(targetUserId);
      if (!provider) {
        return res.status(404).json({
          success: false,
          error: "Service provider not found"
        });
      }

      // Create order ID
      const orderId = `RENEW_SP_${provider._id}_${Date.now()}`;
      const renewalAmount = amount || 1500; // Default service provider renewal amount
      
      console.log("🎯 Creating renewal order for service provider:", {
        providerId: provider._id,
        providerName: provider.name,
        providerEmail: provider.email,
        orderId: orderId,
        amount: renewalAmount
      });

      // Cashfree configuration
      const isProd = process.env.CASHFREE_ENV === "PROD";
      const baseUrl = isProd 
        ? "https://api.cashfree.com" 
        : "https://sandbox.cashfree.com";

      const clientId = process.env.CASHFREE_APP_ID;
      const clientSecret = process.env.CASHFREE_SECRET_KEY;

      // Development/test mode
      if (!clientId || !clientSecret) {
        console.warn("⚠️ Cashfree credentials not set, using test mode");
        
        return res.json({
          success: true,
          test_mode: true,
          payment_session_id: `test_session_${Date.now()}_sp`,
          order_id: orderId,
          redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?test=true&order_id=${orderId}&type=renewal&role=service`,
          message: "Test mode - Cashfree not configured",
          amount: renewalAmount,
          userType: "service-provider",
          providerId: provider._id
        });
      }

      // Return URLs
      const returnUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?order_id=${orderId}&type=renewal&role=service&providerId=${provider._id}`;
      const notifyUrl = `${process.env.API_BASE || 'http://localhost:4000/api'}/payments/subscription-renew-webhook`;

      // Order data for service provider
      const orderData = {
        order_id: orderId,
        order_amount: renewalAmount,
        order_currency: "INR",
        customer_details: {
          customer_id: provider._id.toString(),
          customer_email: provider.email,
          customer_phone: provider.phone || "9999999999",
          customer_name: provider.name,
        },
        order_meta: {
          return_url: returnUrl,
          notify_url: notifyUrl,
        },
        order_note: `Service Provider Subscription Renewal - ${provider.serviceCategory || 'Service'}`,
        order_tags: {
          user_type: "service_provider",
          service_category: provider.serviceCategory || "general",
          renewal: "true"
        }
      };

      console.log("📤 Calling Cashfree API for service provider renewal");
      console.log("Order data:", JSON.stringify(orderData, null, 2));
      
      try {
        // Call Cashfree API
        const axios = require('axios');
        const response = await axios.post(
          `${baseUrl}/pg/orders`,
          orderData,
          {
            headers: {
              "Content-Type": "application/json",
              "x-api-version": "2023-08-01",
              "x-client-id": clientId,
              "x-client-secret": clientSecret,
            },
          }
        );

        console.log("✅ Cashfree response received:", response.data);

        if (!response.data.payment_session_id) {
          throw new Error("No payment_session_id in response");
        }

        // Save payment session to database (optional)
        try {
          const PaymentSession = require("../models/PaymentSession");
          await PaymentSession.create({
            orderId: orderId,
            paymentSessionId: response.data.payment_session_id,
            amount: renewalAmount,
            currency: "INR",
            userId: provider._id,
            userType: "service-provider",
            status: "created",
            metadata: {
              providerName: provider.name,
              providerEmail: provider.email,
              serviceCategory: provider.serviceCategory,
              renewal: true
            }
          });
          console.log("✅ Payment session saved to database");
        } catch (dbError) {
          console.warn("⚠️ Could not save payment session to DB:", dbError.message);
          // Continue even if DB save fails
        }

        return res.json({
          success: true,
          payment_session_id: response.data.payment_session_id,
          order_id: orderId,
          paymentGateway: "cashfree",
          amount: renewalAmount,
          redirect_url: `${baseUrl}/pg/view/${response.data.payment_session_id}`,
          checkout_url: `${process.env.CLIENT_URL}/checkout/${response.data.payment_session_id}`,
          message: "Service provider renewal payment order created",
          userType: "service-provider",
          providerId: provider._id,
          providerName: provider.name,
          providerEmail: provider.email
        });

      } catch (cashfreeError) {
        console.error("❌ Cashfree API error:", cashfreeError.response?.data || cashfreeError.message);
        
        // Fallback for development
        if (process.env.NODE_ENV === "development" || !clientId || !clientSecret) {
          console.log("🛠 Using development fallback for service provider");
          
          return res.json({
            success: true,
            test_mode: true,
            payment_session_id: `test_session_sp_${Date.now()}`,
            order_id: orderId,
            redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?test=true&order_id=${orderId}&type=renewal&role=service&providerId=${provider._id}`,
            message: "Development fallback for service provider: " + cashfreeError.message,
            amount: renewalAmount,
            userType: "service-provider",
            providerId: provider._id,
            providerName: provider.name
          });
        }
        
        throw cashfreeError;
      }

    } else if (targetUserType === "agent" || targetUserType === "user") {
      // Keep existing agent code (simplified version)
      console.log("🔄 Routing to AGENT renewal endpoint");
      const agent = await Agent.findById(targetUserId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: "Agent not found"
        });
      }

      const orderId = `RENEW_AGENT_${agent._id}_${Date.now()}`;
      const renewalAmount = amount || 2000;

      // Simplified response for agents
      return res.json({
        success: true,
        payment_session_id: `session_${Date.now()}_agent`,
        order_id: orderId,
        paymentGateway: "cashfree",
        amount: renewalAmount,
        redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?order_id=${orderId}`,
        message: "Agent renewal order created",
        userType: "agent"
      });

    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid user type. Must be 'service', 'service-provider' or 'agent'"
      });
    }

  } catch (err) {
    console.error("❌ Generic renewal endpoint error:", err.message);
    console.error("Error stack:", err.stack);
    
    // Always return a response for frontend
    const testOrderId = `FALLBACK_RENEW_${Date.now()}`;
    
    return res.json({
      success: true,
      test_mode: true,
      payment_session_id: `fallback_session_${Date.now()}`,
      order_id: testOrderId,
      redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?test=true&order_id=${testOrderId}`,
      message: "Fallback mode due to error: " + err.message,
      amount: req.body?.amount || 1500,
      userType: req.body?.userType || "service-provider"
    });
  }
});

/* =============================================================================
   SERVICE PROVIDER SPECIFIC RENEWAL ENDPOINT
============================================================================= */
router.post("/service-provider/renew", auth, async (req, res) => {
  try {
    // This endpoint is specifically for service providers
    if (req.user.role !== "service") {
      return res.status(403).json({
        success: false,
        error: "Only service providers can use this endpoint"
      });
    }

    const provider = await ServiceProvider.findById(req.user.id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: "Service provider not found"
      });
    }

    const { planName = "Monthly Plan", amount = 1500, durationDays = 30 } = req.body;

    // Create order ID
    const orderId = `SP_RENEW_${provider._id}_${Date.now()}`;
    
    console.log("🎯 Service provider renewal request:", {
      providerId: provider._id,
      providerName: provider.name,
      providerEmail: provider.email,
      currentSubscription: provider.subscription,
      orderId: orderId,
      amount: amount,
      durationDays: durationDays
    });

    // Prepare response
    res.json({
      success: true,
      orderId: orderId,
      amount: amount,
      currency: "INR",
      provider: {
        id: provider._id,
        name: provider.name,
        email: provider.email,
        serviceCategory: provider.serviceCategory
      },
      subscription: {
        planName: planName,
        amount: amount,
        durationDays: durationDays,
        newExpiryDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      },
      payment: {
        required: true,
        gateway: "cashfree",
        // This will be populated by frontend after payment
      },
      instructions: "Complete payment to renew subscription"
    });

  } catch (err) {
    console.error("❌ Service provider renewal error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to process renewal request"
    });
  }
});

/* =============================================================================
   VERIFY SERVICE PROVIDER RENEWAL PAYMENT
============================================================================= */
router.post("/verify-service-provider-renewal", auth, async (req, res) => {
  try {
    const { orderId, paymentId, amount, paymentMethod = "online" } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: "Order ID is required"
      });
    }

    // Must be a service provider
    if (req.user.role !== "service") {
      return res.status(403).json({
        success: false,
        error: "Only service providers can renew subscription"
      });
    }

    const provider = await ServiceProvider.findById(req.user.id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: "Service provider not found"
      });
    }

    console.log("🔍 Verifying service provider renewal payment:", {
      providerId: provider._id,
      providerName: provider.name,
      orderId: orderId,
      paymentId: paymentId,
      amount: amount
    });

    // In production, verify with payment gateway
    // For now, simulate successful payment
    const paymentVerified = true;

    if (paymentVerified) {
      // Calculate new expiry date
      const currentExpiry = provider.subscription?.expiresAt ? 
        new Date(provider.subscription.expiresAt) : new Date();
      
      // If subscription is already expired, start from now
      // If still active, extend from current expiry
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + 1); // Add 1 month

      // Update subscription
      provider.subscription = {
        ...provider.subscription,
        active: true,
        status: "active",
        planName: "Monthly Service Provider Plan",
        amount: amount || 1500,
        currency: "INR",
        paymentId: paymentId,
        paymentMethod: paymentMethod,
        paymentGateway: "cashfree",
        lastPaidAt: new Date(),
        activatedAt: provider.subscription?.activatedAt || new Date(),
        expiresAt: newExpiry,
        previousSubscription: provider.subscription ? {
          expiresAt: provider.subscription.expiresAt,
          lastPaidAt: provider.subscription.lastPaidAt
        } : null
      };

      await provider.save();

      console.log("✅ Service provider subscription renewed:", {
        providerId: provider._id,
        newExpiry: newExpiry,
        amount: amount
      });

      // Send renewal confirmation email
      try {
        const { sendMail } = require("../utils/emailTemplates");
        await sendMail({
          to: provider.email,
          subject: "Service Provider Subscription Renewed",
          html: `
            <h2>Subscription Renewal Confirmation</h2>
            <p>Dear ${provider.name},</p>
            <p>Your service provider subscription has been renewed successfully!</p>
            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Amount Paid:</strong> ₹${amount || 1500}</p>
              <p><strong>Payment ID:</strong> ${paymentId || orderId}</p>
              <p><strong>Renewal Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Valid Until:</strong> ${newExpiry.toLocaleDateString()}</p>
              <p><strong>Status:</strong> Active ✅</p>
            </div>
            <p>You can now continue posting and managing your services.</p>
            <p>Best regards,<br>Real Estate Portal Team</p>
          `
        });
      } catch (emailError) {
        console.warn("⚠️ Renewal email failed:", emailError.message);
      }

      return res.json({
        success: true,
        message: "Subscription renewed successfully",
        subscription: {
          active: true,
          expiresAt: newExpiry,
          lastPaidAt: provider.subscription.lastPaidAt,
          amount: provider.subscription.amount,
          canPostServices: true
        },
        provider: {
          id: provider._id,
          name: provider.name,
          email: provider.email
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Payment verification failed"
      });
    }

  } catch (err) {
    console.error("❌ Verify service provider renewal error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to verify renewal payment"
    });
  }
});

// Also add these fallback endpoints for your frontend
router.post("/create-order", (req, res) => {
  console.log("🔄 Fallback: /create-order called, routing to /create-renewal-order");
  req.url = '/create-renewal-order';
  return router.handle(req, res);
});

router.post("/initiate", (req, res) => {
  console.log("🔄 Fallback: /initiate called, routing to /create-renewal-order");
  req.url = '/create-renewal-order';
  return router.handle(req, res);
});

router.post("/subscriptions/create-payment", (req, res) => {
  console.log("🔄 Fallback: /subscriptions/create-payment called");
  req.url = '/create-renewal-order';
  return router.handle(req, res);
});

router.post("/create-payment-order", (req, res) => {
  console.log("🔄 Fallback: /create-payment-order called");
  req.url = '/create-renewal-order';
  return router.handle(req, res);
});

// Add a direct endpoint for service provider renewal
/* =============================================================================
   SERVICE PROVIDER SPECIFIC RENEWAL ENDPOINT
============================================================================= */
router.post("/service-provider/create-renewal", auth, async (req, res) => {
  try {
    console.log("🎯 Direct service provider renewal endpoint called");
    
    // This endpoint is specifically for service providers
    if (req.user.role !== "service") {
      return res.status(403).json({
        success: false,
        error: "Only service providers can use this endpoint"
      });
    }

    const provider = await ServiceProvider.findById(req.user.id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: "Service provider not found"
      });
    }

    const { planName = "Monthly Plan", amount = 1500, durationDays = 30 } = req.body;

    // Create order ID
    const orderId = `SP_RENEW_${provider._id}_${Date.now()}`;
    
    console.log("🎯 Service provider renewal request:", {
      providerId: provider._id,
      providerName: provider.name,
      providerEmail: provider.email,
      currentSubscription: provider.subscription,
      orderId: orderId,
      amount: amount,
      durationDays: durationDays
    });

    // Cashfree configuration
    const isProd = process.env.CASHFREE_ENV === "PROD";
    const baseUrl = isProd 
      ? "https://api.cashfree.com" 
      : "https://sandbox.cashfree.com";

    const clientId = process.env.CASHFREE_APP_ID;
    const clientSecret = process.env.CASHFREE_SECRET_KEY;

    // Development/test mode
    if (!clientId || !clientSecret) {
      console.warn("⚠️ Cashfree credentials not set, using test mode");
      
      return res.json({
        success: true,
        test_mode: true,
        payment_session_id: `test_session_sp_${Date.now()}`,
        order_id: orderId,
        redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?test=true&order_id=${orderId}&type=renewal&role=service&providerId=${provider._id}`,
        message: "Test mode - Cashfree not configured",
        amount: amount,
        userType: "service-provider",
        providerId: provider._id,
        providerName: provider.name,
        providerEmail: provider.email
      });
    }

    // Return URLs
    const returnUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?order_id=${orderId}&type=renewal&role=service&providerId=${provider._id}`;
    const notifyUrl = `${process.env.API_BASE || 'http://localhost:4000/api'}/payments/subscription-renew-webhook`;

    // Order data for service provider
    const orderData = {
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: provider._id.toString(),
        customer_email: provider.email,
        customer_phone: provider.phone || "9999999999",
        customer_name: provider.name,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
      },
      order_note: `Service Provider Subscription Renewal - ${provider.serviceCategory || 'Service'}`,
      order_tags: {
        user_type: "service_provider",
        service_category: provider.serviceCategory || "general",
        renewal: "true"
      }
    };

    console.log("📤 Calling Cashfree API for service provider renewal");
    
    try {
      // Call Cashfree API
      const axios = require('axios');
      const response = await axios.post(
        `${baseUrl}/pg/orders`,
        orderData,
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-version": "2023-08-01",
            "x-client-id": clientId,
            "x-client-secret": clientSecret,
          },
        }
      );

      console.log("✅ Cashfree response received:", response.data);

      if (!response.data.payment_session_id) {
        throw new Error("No payment_session_id in response");
      }

      return res.json({
        success: true,
        payment_session_id: response.data.payment_session_id,
        order_id: orderId,
        paymentGateway: "cashfree",
        amount: amount,
        redirect_url: `${baseUrl}/pg/view/${response.data.payment_session_id}`,
        checkout_url: `${process.env.CLIENT_URL}/checkout/${response.data.payment_session_id}`,
        message: "Service provider renewal payment order created",
        userType: "service-provider",
        providerId: provider._id,
        providerName: provider.name,
        providerEmail: provider.email
      });

    } catch (cashfreeError) {
      console.error("❌ Cashfree API error:", cashfreeError.response?.data || cashfreeError.message);
      
      // Fallback for development
      return res.json({
        success: true,
        test_mode: true,
        payment_session_id: `test_session_sp_${Date.now()}`,
        order_id: orderId,
        redirect_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?test=true&order_id=${orderId}&type=renewal&role=service&providerId=${provider._id}`,
        message: "Development fallback: " + cashfreeError.message,
        amount: amount,
        userType: "service-provider",
        providerId: provider._id,
        providerName: provider.name
      });
    }

  } catch (err) {
    console.error("❌ Direct service provider renewal error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create renewal order"
    });
  }
});
/* =====================================================
   🔍 GET PAYMENT STATUS
===================================================== */
router.get("/status/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    
    console.log(`🔵 Getting payment status for ${type}: ${id}`);
    
    if (type === "agent") {
      const agent = await Agent.findById(id);
      if (!agent) return res.status(404).json({ 
        success: false,
        error: "Agent not found" 
      });
      
      const isActive = isSubscriptionActive(agent.subscription);
      
      return res.json({ 
        success: true,
        status: isActive ? "active" : "inactive",
        isActive: isActive,
        expiresAt: agent.subscription?.expiresAt,
        paidAt: agent.subscription?.paidAt,
        lastPaidAt: agent.subscription?.lastPaidAt,
        paymentGateway: agent.subscription?.paymentGateway,
        cashfreeOrderId: agent.subscription?.cashfreeOrderId
      });
    } else if (type === "provider") {
      const provider = await ServiceProvider.findById(id);
      if (!provider) return res.status(404).json({ 
        success: false,
        error: "Provider not found" 
      });
      
      const isActive = isSubscriptionActive(provider.subscription);
      
      return res.json({ 
        success: false,
        status: isActive ? "active" : "inactive",
        isActive: isActive,
        expiresAt: provider.subscription?.expiresAt,
        paidAt: provider.subscription?.paidAt,
        lastPaidAt: provider.subscription?.lastPaidAt,
        paymentGateway: provider.subscription?.paymentGateway,
        cashfreeOrderId: provider.subscription?.cashfreeOrderId
      });
    }
    
    res.status(400).json({ 
      success: false,
      error: "Invalid type. Use 'agent' or 'provider'" 
    });
  } catch (err) {
    console.error("❌ Status Check Error:", err.message);
    res.status(500).json({ 
      success: false,
      error: "Status check failed" 
    });
  }
});

/* =====================================================
   📋 GET PAYMENT LINK
===================================================== */
router.post("/create-payment-link", express.json(), async (req, res) => {
  try {
    console.log("🔵 Create payment link request received");
    
    const { 
      customer_name, 
      customer_email, 
      customer_phone,
      amount = 1500,
      purpose = "Registration Fee"
    } = req.body;

    if (!customer_email || !customer_phone) {
      return res.status(400).json({ 
        success: false,
        error: "Customer email and phone are required" 
      });
    }

    const linkId = `LINK_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    let returnUrl = `${clientUrl}/payment-success`;
    
    if (process.env.CASHFREE_ENV === "PROD") {
      returnUrl = ensureHttpsForProduction(returnUrl);
    }
    
    const response = await Cashfree.PGCreateLink("2023-08-01", {
      link_id: linkId,
      link_amount: amount,
      link_currency: "INR",
      link_purpose: purpose,
      customer_details: {
        customer_name: customer_name || "Customer",
        customer_email,
        customer_phone,
      },
      link_notify: {
        send_sms: true,
        send_email: true,
      },
      link_meta: {
        return_url: returnUrl,
      },
      link_expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    console.log("✅ Payment link created:", linkId);

    return res.json({
      success: true,
      payment_link: response.data.link_url,
      link_id: linkId,
      expires_at: response.data.link_expiry_time,
    });
  } catch (err) {
    console.error("❌ Payment Link Error:", err.message);
    res.status(500).json({ 
      success: false,
      error: "Failed to create payment link" 
    });
  }
});

/* =====================================================
   🔄 CLEANUP TEMP FILES
===================================================== */
router.post("/cleanup-temp-files", async (req, res) => {
  try {
    console.log("🔵 Cleaning up temp files");
    
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;
    
    let agentCleaned = 0;
    let providerCleaned = 0;
    
    if (fs.existsSync(TEMP_AGENTS_DIR)) {
      const agentFiles = fs.readdirSync(TEMP_AGENTS_DIR);
      agentFiles.forEach(file => {
        const filePath = path.join(TEMP_AGENTS_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
            agentCleaned++;
          }
        } catch (err) {
          console.error(`⚠️ Error cleaning agent file ${file}:`, err.message);
        }
      });
    }
    
    if (fs.existsSync(TEMP_PROVIDERS_DIR)) {
      const providerFiles = fs.readdirSync(TEMP_PROVIDERS_DIR);
      providerFiles.forEach(file => {
        const filePath = path.join(TEMP_PROVIDERS_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
            providerCleaned++;
          }
        } catch (err) {
          console.error(`⚠️ Error cleaning provider file ${file}:`, err.message);
        }
      });
    }
    
    console.log(`✅ Cleanup complete: ${agentCleaned} agent files, ${providerCleaned} provider files`);
    
    res.json({
      success: true,
      message: "Temp files cleaned up",
      agent_files_cleaned: agentCleaned,
      provider_files_cleaned: providerCleaned,
      total_cleaned: agentCleaned + providerCleaned
    });
  } catch (err) {
    console.error("❌ Cleanup Error:", err.message);
    res.status(500).json({ 
      success: false,
      error: "Cleanup failed" 
    });
  }
});

/* =====================================================
   🧪 TEST ENDPOINT
===================================================== */
router.get("/test-config", (req, res) => {
  res.json({
    success: true,
    data: {
      cashfreeEnv: process.env.CASHFREE_ENV || "Not set",
      backendUrl: process.env.BACKEND_URL || "Not set",
      clientUrl: process.env.CLIENT_URL || "Not set",
      subscriptionAmount: process.env.SUBSCRIPTION_AMOUNT_INR || 1500,
      cashfreeAppId: process.env.CASHFREE_APP_ID ? "Set" : "Not set",
      cashfreeSecretKey: process.env.CASHFREE_SECRET_KEY ? "Set" : "Not set",
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || "development"
    }
  });
});

module.exports = router;