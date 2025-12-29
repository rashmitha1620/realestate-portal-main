const mongoose = require("mongoose");

const companyBannerSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String, // /uploads/company-banners/xxx.jpg
      required: true,
    },

    priority: {
      type: Number,
      default: 10, // lower = higher priority
    },

    serviceCategory: {
      type: String,
      enum: [
        "Real Estate Agency",
        "Builder & Developer",
        "Legal & Documentation",
        "Interior & Construction",
        "Loan & Finance",
      ],
    },

    services: [
      {
        type: String,
        trim: true,
      },
    ],

    listingTypes: {
      type: [String],
      enum: ["Sell", "Rent", "Lease", "PG", "Farm Lease"],
    },

    propertyTypes: {
      type: [String],
      enum: [
        "Apartment",
        "Villa",
        "Open Plot",
        "Commercial",
        "Farmland",
      ],
    },

    operatingCities: String,

    phone: String,
    website: String,

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanyBanner", companyBannerSchema);
