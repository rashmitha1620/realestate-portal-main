const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ServiceProviderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, index: true },
    password: { type: String, required: true },

    role: { type: String, default: "service" },

    /* ================================
       PASSWORD RESET
       ================================ */
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },

    serviceTypes: {
      type: [String],
      default: [],
    },

    /* =====================================================
       ⭐ REFERRAL INFORMATION
       ===================================================== */
    referralMarketingExecutiveName: { type: String, default: null },
    referralMarketingExecutiveId: { type: String, default: null },

    referralAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      default: null,
    },

    /* =====================================================
       DOCUMENTS
       ===================================================== */
    documents: {
      aadhar: { type: String, required: true },
      voterId: { type: String, required: true },
      pan: { type: String, default: null },
    },

    /* =====================================================
       SUBSCRIPTION (CASHFREE ✅)
       ===================================================== */
    subscription: {
      active: { type: Boolean, default: false },

      lastPaidAt: { type: Date },
      expiresAt: { type: Date },

      amount: { type: Number, default: 1500 },
      currency: { type: String, default: "INR" },

      paymentGateway: {
        type: String,
        enum: ["cashfree"],
        default: "cashfree",
      },

      cashfreeOrderId: { type: String },
      cashfreePaymentId: { type: String },
    },

    status: {
      type: String,
      enum: ["pending_payment", "active", "blocked"],
      default: "pending_payment",
    },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/* =====================================================
   🔐 AUTO-HASH PASSWORD
===================================================== */
ServiceProviderSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/* =====================================================
   ✅ CHECK SUBSCRIPTION VALID
===================================================== */
ServiceProviderSchema.methods.isSubscriptionActive = function () {
  return (
    this.subscription?.active &&
    this.subscription?.expiresAt &&
    this.subscription.expiresAt > new Date()
  );
};

module.exports = mongoose.model("ServiceProvider", ServiceProviderSchema);
