const jwt = require("jsonwebtoken");
const mongoose = require("mongoose"); // Added for ObjectId
const Agent = require("../models/Agent");
const ServiceProvider = require("../models/ServiceProvider");
const MarketingExecutive = require("../models/MarketingExecutive");

// Helper function to check dynamic public routes WITH METHOD CHECK
function checkDynamicPublicRoutes(url, method) {
  const dynamicPublicPatterns = [
    // ✅ ADD RESET-PASSWORD ROUTES
    { pattern: /^\/api\/agents\/reset-password\/[a-zA-Z0-9]+$/, methods: ['POST'] },
    { pattern: /^\/api\/service-provider\/reset-password\/[a-zA-Z0-9]+$/, methods: ['POST'] },
    
    // These should be public for GET only
    { pattern: /^\/api\/service-provider\/[a-fA-F0-9]{24}$/, methods: ['GET'] }, // /service-provider/:id
    { pattern: /^\/api\/service-provider\/[a-fA-F0-9]{24}\/services$/, methods: ['GET'] }, // /service-provider/:id/services
    { pattern: /^\/api\/service-provider\/service\/[a-fA-F0-9]{24}$/, methods: ['GET'] }, // /service-provider/service/:id
    
    // These can be public for all methods
    { pattern: /^\/api\/service-provider\/by-email\?/, methods: ['GET', 'POST'] },
    { pattern: /^\/api\/service-provider\/subscription-status\/[a-fA-F0-9]{24}$/, methods: ['GET'] },
    { pattern: /^\/api\/service-provider\/can-post-services\/[a-fA-F0-9]{24}$/, methods: ['GET'] },
    { pattern: /^\/api\/service-provider\/services-count\/[a-fA-F0-9]{24}$/, methods: ['GET'] },
  ];

  return dynamicPublicPatterns.some(item => 
    item.pattern.test(url) && item.methods.includes(method)
  );
}

async function auth(req, res, next) {
  try {
    console.log("🔐 AUTH MIDDLEWARE START =================");
    console.log("URL:", req.originalUrl);
    console.log("Method:", req.method);
    
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
      console.log("Token found in header");
    } else {
      console.log("No Bearer token in header");
    }

    // ✅ UPDATED: More comprehensive public routes list
    const publicRoutes = [
      // Agent public routes
      "/agents/login",
      "/agents/register",
      "/agents/forgot-password",
      "/agents/reset-password",
      "/agents/renewal/verify-email",
      "/agents/renewal/create-order",
      "/agents/renewal/verify-payment",

      // Service Provider public routes
      "/service-provider/login",
      "/service-provider/register",
      "/service-provider/forgot-password",
      "/service-provider/reset-password",
      "/service-provider/renewal/verify-email",
      "/service-provider/renewal/create-order",
      "/service-provider/renewal/verify-payment",

      // Marketing Executive public routes
      "/marketing-executive/login",

      // Admin public routes
      "/admin/login",

      // ⭐ CRITICAL: Service Provider public browsing routes (GET only)
      // These are handled in checkDynamicPublicRoutes with method restriction
    ];

    // ⭐ CRITICAL FIX: Check for reset-password routes with tokens FIRST
    // This must come BEFORE the exact match check
    if (req.method === 'POST' && (
        req.originalUrl.startsWith('/api/agents/reset-password/') ||
        req.originalUrl.startsWith('/api/service-provider/reset-password/')
    )) {
      console.log("🔓 Public reset-password route (with token):", req.originalUrl);
      return next();
    }

    // First check exact matches in publicRoutes
    const exactPublicMatch = publicRoutes.some(
      (route) => req.originalUrl === `/api${route}`
    );

    if (exactPublicMatch) {
      console.log("🔓 Public route (exact match):", req.originalUrl);
      return next();
    }

    // ⭐ IMPORTANT: Check for service-provider root and all-providers (GET only)
    if (req.method === 'GET') {
      if (req.originalUrl === '/api/service-provider' || 
          req.originalUrl === '/api/service-provider/' ||
          req.originalUrl === '/api/service-provider/all-providers') {
        console.log("🔓 Service provider public browsing route:", req.originalUrl);
        return next();
      }
    }

    // Check for dynamic public routes WITH METHOD CHECK
    const isDynamicPublicRoute = checkDynamicPublicRoutes(req.originalUrl, req.method);
    
    if (isDynamicPublicRoute) {
      console.log("🔓 Public route (dynamic, method:", req.method, "):", req.originalUrl);
      return next();
    }

    // If no token for protected routes
    if (!token) {
      console.log("❌ No token for protected route:", req.originalUrl);
      console.log("Method:", req.method);
      return res.status(401).json({ error: "No token provided" });
    }

    // ✅ VERIFY TOKEN
    console.log("🔐 Verifying token for:", req.originalUrl);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Decoded token role:", decoded.role);
    console.log("✅ Decoded token ID:", decoded.id);

    let user = null;

    // 🔥 FIX 1: Handle "marketingExecutive" role
    if (decoded.role === "marketingExecutive") {
      console.log("👔 Processing marketing executive");
      user = await MarketingExecutive.findById(decoded.id);
      
      if (!user) {
        console.log("❌ Marketing executive not found in DB");
        return res.status(401).json({ error: "User not found" });
      }
      
      // ⭐ FIXED: Include meid from the database
      req.user = {
        id: decoded.id,
        role: "marketingExecutive",
        meid: user.meid,
        email: user.email,
        name: user.name,
        isMarketing: true,
        isAgent: false,
        isService: false,
        isAdmin: true,
      };
      console.log("✅ Marketing executive authenticated:", {
        id: req.user.id,
        meid: req.user.meid,
        email: req.user.email
      });
    }
    // 🔥 FIX 2: Also check for "marketing" for backward compatibility
    else if (decoded.role === "marketing") {
      console.log("👔 Processing marketing (legacy)");
      user = await MarketingExecutive.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      req.user = {
        id: decoded.id,
        role: "marketing",
        meid: user.meid,
        email: user.email,
        name: user.name,
        isMarketing: true,
        isAgent: false,
        isService: false,
        isAdmin: true,
      };
    }
    else if (decoded.role === "agent") {
      user = await Agent.findById(decoded.id).select("subscription");
      req.user = {
        id: decoded.id,
        role: "agent",
        isAgent: true,
        isService: false,
        isAdmin: false,
        subscription: user?.subscription,
      };
    }
    else if (decoded.role === "service-provider" || decoded.role === "service") {
      user = await ServiceProvider.findById(decoded.id).select("subscription");
      req.user = {
        id: decoded.id,
        role: "service",
        originalRole: decoded.role,
        isAgent: false,
        isService: true,
        isAdmin: false,
        subscription: user?.subscription,
      };
    }
    // ✅ CRITICAL FIX: Handle admin role with valid ObjectId
    else if (decoded.role === "admin") {
      console.log("👑 Processing admin user");
      
      // ⭐ FIX: Create a consistent ObjectId for admin users
      let adminId;
      let adminObjectId;
      
      if (decoded.id === 'admin' || decoded.id === 'admin-user' || decoded.id === '000000000000000000000001') {
        // Use a consistent ObjectId for admin
        adminId = '000000000000000000000001'; // 24-character hex string
        adminObjectId = new mongoose.Types.ObjectId(adminId);
      } else if (mongoose.Types.ObjectId.isValid(decoded.id)) {
        // If it's already a valid ObjectId
        adminId = decoded.id;
        adminObjectId = new mongoose.Types.ObjectId(adminId);
      } else {
        // Generate a new ObjectId from string hash
        const crypto = require("crypto");
        const hash = crypto.createHash('md5').update(decoded.id).digest('hex').slice(0, 24);
        adminId = hash.padStart(24, '0');
        adminObjectId = new mongoose.Types.ObjectId(adminId);
      }
      
      req.user = {
        id: adminObjectId, // ⭐ Use ObjectId, not string
        role: "admin",
        originalId: decoded.id, // Keep original for reference
        isAdmin: true,
        isAgent: true,
        isService: false,
        isMarketing: false,
        email: decoded.email || "admin@gmail.com",
        name: decoded.name || "Administrator"
      };
      
      console.log("✅ Admin authenticated:", {
        objectId: req.user.id,
        originalId: req.user.originalId,
        email: req.user.email
      });
    }
    else {
      console.log("❌ Invalid token role:", decoded.role);
      return res.status(401).json({ error: "Invalid token role" });
    }

    console.log("✅ Authenticated:", req.user.role, req.user.id);
    console.log("🔐 AUTH MIDDLEWARE END =================\n");
    return next();

  } catch (err) {
    console.error("❌ AUTH ERROR:", err.message);
    if (err.name === "JsonWebTokenError") {
      console.error("❌ JWT Error - Check JWT_SECRET:", process.env.JWT_SECRET ? "Exists" : "Missing");
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { auth };