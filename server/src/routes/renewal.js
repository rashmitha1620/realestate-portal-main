// File: routes/renewal.js
const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const ServiceProvider = require('../models/ServiceProvider');

// NO AUTHENTICATION MIDDLEWARE - Standalone system

// 1. Verify Email (Public)
router.post('/verify-email', async (req, res) => {
  try {
    const { email, userType } = req.body;
    
    if (!email || !userType) {
      return res.status(400).json({
        success: false,
        error: 'Email and user type are required'
      });
    }
    
    // Find user by email
    let user;
    if (userType === 'agent') {
      user = await Agent.findOne({ email: email.toLowerCase() });
    } else {
      user = await ServiceProvider.findOne({ email: email.toLowerCase() });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Account not found with this email'
      });
    }
    
    // Return user info (no sensitive data)
    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 2. Create Renewal Order (Public)
router.post('/create-order', async (req, res) => {
  try {
    const { userId, userType, email } = req.body;
    
    if (!userId || !userType || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Verify user exists
    let user;
    if (userType === 'agent') {
      user = await Agent.findById(userId);
    } else {
      user = await ServiceProvider.findById(userId);
    }
    
    if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(404).json({
        success: false,
        error: 'User verification failed'
      });
    }
    
    // Create order ID
    const timestamp = Date.now();
    const orderId = `RENEW_${userType.toUpperCase()}_${userId}_${timestamp}`;
    const amount = userType === 'agent' ? 2000 : 1500;
    
    // Create Cashfree order (simplified - add your Cashfree logic)
    // const cashfreeOrder = await Cashfree.PGCreateOrder(...);
    
    // For now, return mock response
    return res.json({
      success: true,
      orderId: orderId,
      paymentSessionId: `session_${timestamp}`,
      amount: amount
    });
    
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create payment order'
    });
  }
});

// 3. Verify Payment (Public)
router.post('/verify-payment', async (req, res) => {
  try {
    const { orderId, userId, userType } = req.body;
    
    if (!orderId || !userId || !userType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Find user
    let user;
    if (userType === 'agent') {
      user = await Agent.findById(userId);
    } else {
      user = await ServiceProvider.findById(userId);
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // For now, simulate successful payment
    // In production, verify with Cashfree
    
    // Update subscription
    const now = new Date();
    const newExpiry = new Date();
    newExpiry.setMonth(newExpiry.getMonth() + 1);
    
    user.subscription = {
      ...user.subscription,
      active: true,
      paidAt: now,
      expiresAt: newExpiry,
      cashfreeOrderId: orderId,
      paymentStatus: "SUCCESS",
      amount: userType === 'agent' ? 2000 : 1500,
      lastRenewalDate: now
    };
    
    await user.save();
    
    return res.json({
      success: true,
      message: 'Subscription renewed successfully',
      subscription: {
        expiresAt: newExpiry,
        active: true
      }
    });
    
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Payment verification failed'
    });
  }
});

module.exports = router;