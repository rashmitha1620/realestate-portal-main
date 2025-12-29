const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userType: { type: String, enum: ["agent", "service-provider"], required: true },
  amount: Number,
  status: String,
  paymentSessionId: String,
  timestamp: Date,
  metadata: Object,
});

module.exports = mongoose.model("Transaction", transactionSchema);
