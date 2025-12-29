const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" },
  name: String,
  email: String,
  phone: String,
  message: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Enquiry", enquirySchema);
