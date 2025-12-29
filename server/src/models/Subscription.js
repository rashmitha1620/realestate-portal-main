const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    /* ======================================
       WHO OWNS THIS SUBSCRIPTION
    ====================================== */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    userType: {
      type: String,
      enum: ["agent", "service-provider"],
      required: true,
    },

    /* ======================================
       PAYMENT DETAILS
    ====================================== */
    paymentGateway: {
      type: String,
      enum: ["cashfree"], // future: stripe, razorpay
      default: "cashfree",
    },

    cashfreeOrderId: { type: String },
    cashfreePaymentId: { type: String },

    amount: {
      type: Number,
      default: 1500,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },

    /* ======================================
       TIME PERIOD (MONTHLY)
    ====================================== */
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    /* ======================================
       SYSTEM
    ====================================== */
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/* ======================================
   🔑 HELPERS
====================================== */
subscriptionSchema.methods.isActive = function () {
  return this.status === "active" && this.expiresAt > new Date();
};

module.exports = mongoose.model("Subscription", subscriptionSchema);
