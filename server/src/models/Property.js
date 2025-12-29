const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  description: { type: String },

  category: {
    type: String,
    enum: ["DTCP", "HMDA", "Other"],
    default: "Other",
    index: true,
  },

  propertyType: {
    type: String,
    enum: ["Open Plot", "Apartment", "Villa", "Independent House", "Farmland"],
    default: "Open Plot",
    index: true,
  },
  listingType: {
  type: String,
  enum: ["Sell", "Rent", "Lease", "PG", "Farm Lease"],
  default: "Sell",
},


  isFarmland: { type: Boolean, default: false },

  projectName: { type: String },
  areaName: { type: String, index: true },

  /* ⭐ ADDED CITY FIELD ⭐ */
  city: { type: String, index: true },

  nearestPlace: { type: String },
  nearbyHighway: { type: String },

  price: { type: Number, index: true },
  unit: { type: String, default: "sqft" },

  images: { type: [String], default: [] },
  videoUrl: { type: String, default: "" },

  // Owner is a normal user
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // Agent that uploaded
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" },

  // GeoJSON Point
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],   // [lng, lat]
      default: [0, 0],
    }
  },

  active: { type: Boolean, default: true },
}, { timestamps: true });

propertySchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Property", propertySchema);
