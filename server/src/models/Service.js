const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  description: { type: String },
  price: { type: Number, default: 0 },

  images: [{ type: String }], // paths to uploaded images

  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceProvider",
    required: true,
  },

  createdByAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agent",
    default: null,
  },

  /* ----------------------------------------------------
     NEW FIELD: CITY (supports AP/Telangana small towns)
     - Works with dropdown
     - Works with "Other" → custom city
  ---------------------------------------------------- */
  city: { type: String, required: true },

  /* ----------------------------------------------------
     LOCATION
     - Basic address
     - Lat/Lng (optional)
  ---------------------------------------------------- */
  location: {
    address: { type: String },
    lat: { type: Number },
    lng: { type: Number },
  },

  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Service", serviceSchema);
