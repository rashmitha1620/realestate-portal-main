require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");

const rateLimiter = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");

/* 🔐 AUTH & SUBSCRIPTION */
const { auth } = require("./middleware/auth");
const subscriptionGuard = require("./middleware/subscriptionGuard");

/* 🔁 ROUTES */
const authRoutes = require("./routes/auth");
const propertyRoutes = require("./routes/properties");
const paymentRoutes = require("./routes/payments");
const adminRoutes = require("./routes/admin");
const agentRoutes = require("./routes/agents");
const enquiryRoutes = require("./routes/enquiries");
const serviceProviderRoutes = require("./routes/serviceProviders");
const serviceEnquiryRoutes = require("./routes/serviceEnquiry");
const marketingExecutiveRoutes = require("./routes/marketingExecutive");
const companyBanners = require("./routes/companyBanners");
const serviceProviderRenewalRoutes = require("./routes/serviceProviderRenewal");
const servicesRoutes = require("./routes/services");


const app = express();

/* =====================================================
   🌍 CORS
===================================================== */
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/* =====================================================
   📁 STATIC FILES
===================================================== */
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"))
);

/* =====================================================
   🛡 SECURITY & LOGGING
===================================================== */
app.use(helmet());
app.use(morgan("dev"));
app.use(rateLimiter);

/* =====================================================
   📦 BODY PARSER
===================================================== */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* =====================================================
   🔓 PUBLIC ROUTES (NO AUTH / NO SUBSCRIPTION)
===================================================== */
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);          // renew + verify
app.use("/api/company-banners", companyBanners);
app.use("/api/services", servicesRoutes);

/* 🔓 PUBLIC PROPERTY VIEW (IMPORTANT FIX) */
app.use("/api/properties", propertyRoutes);       // 👈 PUBLIC GET routes only
app.use("/api/service-provider/renewal", serviceProviderRenewalRoutes);



/* =====================================================
   🔐 AUTHENTICATED + SUBSCRIPTION REQUIRED
===================================================== */
app.use("/api/agents", auth, subscriptionGuard, agentRoutes);
app.use("/api/enquiries", auth, subscriptionGuard, enquiryRoutes);
app.use(
  "/api/service-provider",
  auth,
  subscriptionGuard,
  serviceProviderRoutes
);
app.use(
  "/api/service-enquiries",
  auth,
  subscriptionGuard,
  serviceEnquiryRoutes
);

/* =====================================================
   👑 ADMIN & MARKETING (NO SUB BLOCK)
===================================================== */
app.use("/api/admin", auth, adminRoutes);
app.use("/api/marketing-executive", marketingExecutiveRoutes);

/* =====================================================
   ❌ ERROR HANDLER
===================================================== */
app.use(errorHandler);

module.exports = app;
