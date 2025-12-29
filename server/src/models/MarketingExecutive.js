const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

function generateMEID() {
  return "ME-" + Math.floor(10000 + Math.random() * 90000);
}

const marketingExecutiveSchema = new mongoose.Schema({
  meid: { type: String, unique: true, default: generateMEID },

  name: { type: String, required: true },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,   // ⭐ automatic lowercase
    trim: true         // ⭐ remove spaces
  },

  phone: String,

  password: { type: String, required: true },

   /* ================================
     PASSWORD RESET (NEW ✅)
  ================================ */
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },

  createdAt: { type: Date, default: Date.now },


});

// ⭐ HASH PASSWORD
marketingExecutiveSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ⭐ Compare password
marketingExecutiveSchema.methods.comparePassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("MarketingExecutive", marketingExecutiveSchema);
