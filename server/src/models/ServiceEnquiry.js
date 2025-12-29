const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema({
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceProvider", required: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  message: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ServiceEnquiry", enquirySchema);
