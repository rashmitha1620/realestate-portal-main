const Agent = require("../models/Agent");
const ServiceProvider = require("../models/ServiceProvider");

/* =====================================================
   🔒 SUBSCRIPTION VALIDATION HELPER
===================================================== */
function isSubscriptionValid(subscription) {
  console.log("🔍 Checking subscription:", subscription);

  if (!subscription) return false;
  if (!subscription.active) return false;

  const now = new Date();

  // ✅ Case 1: expiresAt exists
  if (subscription.expiresAt) {
    const expiresAt = new Date(subscription.expiresAt);
    const valid = now <= expiresAt;

    console.log("📅 expiresAt:", expiresAt.toISOString());
    console.log("⏰ now:", now.toISOString());
    console.log("✅ valid:", valid);

    return valid;
  }

  // ✅ Case 2: paidAt exists but expiresAt missing
  if (subscription.paidAt) {
    const paidAt = new Date(subscription.paidAt);
    const calculatedExpiry = new Date(paidAt);
    calculatedExpiry.setMonth(calculatedExpiry.getMonth() + 1);

    const valid = now <= calculatedExpiry;

    console.log("⚠️ expiresAt missing, calculated expiry:", calculatedExpiry.toISOString());
    return valid;
  }

  return false;
}

/* =====================================================
   🔐 SUBSCRIPTION GUARD MIDDLEWARE
===================================================== */
module.exports = async function subscriptionGuard(req, res, next) {
  try {
    console.log("\n🔐 ========== SUBSCRIPTION GUARD ==========");
    console.log("📡 Route:", req.method, req.originalUrl);

    // 🔓 Public route
    if (!req.user) {
      console.log("🔓 No user → public route");
      return next();
    }

    // 🔓 Admin bypass
    if (req.user.isAdmin) {
      console.log("🔓 Admin bypass");
      return next();
    }

    let dbUser = null;

    if (req.user.isAgent) {
      console.log("👤 Loading agent");
      dbUser = await Agent.findById(req.user.id).select("subscription name email");
    } else if (req.user.isService) {
      console.log("👤 Loading service provider");
      dbUser = await ServiceProvider.findById(req.user.id).select("subscription name email");
    } else {
      return next();
    }

    if (!dbUser) {
      return res.status(401).json({ error: "User not found" });
    }

    // 🛠 Fix missing expiresAt ONCE
    if (
      dbUser.subscription?.active &&
      dbUser.subscription.paidAt &&
      !dbUser.subscription.expiresAt
    ) {
      const paidAt = new Date(dbUser.subscription.paidAt);
      const expiresAt = new Date(paidAt);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      dbUser.subscription.expiresAt = expiresAt;
      dbUser.subscription.lastPaidAt ||= paidAt;

      await dbUser.save();
      console.log("🛠 Fixed missing expiresAt");
    }

    // ✅ Final validation
    const valid = isSubscriptionValid(dbUser.subscription);

    if (!valid) {
      console.log("🚫 BLOCKED: Subscription expired");

      return res.status(403).json({
        code: "SUBSCRIPTION_EXPIRED",
        message: "Subscription expired. Please renew.",
        renewRequired: true,
        subscription: {
          paidAt: dbUser.subscription?.paidAt,
          expiresAt: dbUser.subscription?.expiresAt,
        },
      });
    }

    console.log("✅ Subscription valid");
    return next();

  } catch (err) {
    console.error("❌ Subscription guard error:", err);
    return res.status(500).json({
      error: "Subscription validation failed",
    });
  }
};
