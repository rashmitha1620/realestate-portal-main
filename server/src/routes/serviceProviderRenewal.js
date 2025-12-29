// server/src/routes/serviceProviderRenewal.js
const express = require("express");
const ServiceProvider = require("../models/ServiceProvider");
const Cashfree = require("../utils/cashfree");
const Transaction = require("../models/Transaction");
const router = express.Router();

// Service Provider Renewal - Email Verification
router.post("/verify-email", async (req, res) => {
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

// Service Provider Renewal - Create Order
router.post("/create-order", async (req, res) => {
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
    returnUrl.searchParams.set("userType", "service-provider"); // Also update this

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

    // ✅ FIXED: Use "service-provider" instead of "service"
    await Transaction.create({
      orderId,
      userId,
      userType: "service-provider",  // ← THIS IS THE FIX
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
    
    // Better error handling
    if (err.name === 'ValidationError') {
      console.error("❌ Transaction validation error details:", err.errors);
      return res.status(400).json({ 
        success: false, 
        error: "Transaction validation failed",
        details: Object.keys(err.errors).map(key => ({
          field: key,
          message: err.errors[key].message
        }))
      });
    }
    
    res.status(500).json({ success: false, error: "Order creation failed" });
  }
});
// Service Provider Renewal - Verify Payment
router.post("/verify-payment", async (req, res) => {
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

module.exports = router;