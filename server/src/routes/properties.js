// server/src/routes/properties.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Property = require("../models/Property");
const Agent = require("../models/Agent");
const { auth } = require("../middleware/auth");

const subscriptionGuard = require("../middleware/subscriptionGuard");

const router = express.Router();

/* ==========================================================
   🔑 HELPER — SUBSCRIPTION CHECK
========================================================== */
function isSubscriptionValid(subscription) {
  if (!subscription) return false;
  if (!subscription.active) return false;

  const now = new Date();

  // ✅ Use expiresAt if available
  if (subscription.expiresAt) {
    return new Date(subscription.expiresAt) > now;
  }

  // ✅ Fallback: calculate expiry from paidAt
  if (subscription.paidAt) {
    const paidAt = new Date(subscription.paidAt);
    const expiresAt = new Date(paidAt);
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    return expiresAt > now;
  }

  return false;
}


/* ==========================================================
   🔑 HELPER — GET AGENT SUBSCRIPTION STATUS
========================================================== */
async function getAgentSubscriptionStatus(agentId) {
  try {
    if (!agentId) return { valid: true, isAgent: false }; // Allow non-agent posts (admin/owner)
    
    const agent = await Agent.findById(agentId).select("subscription");
    if (!agent) return { valid: false, isAgent: false };
    
    return {
      valid: isSubscriptionValid(agent.subscription),
      isAgent: true,
      subscription: agent.subscription
    };
  } catch (err) {
    console.error("Error checking agent subscription:", err);
    return { valid: false, isAgent: false };
  }
}

/* ==========================================================
   🔑 HELPER — CHECK USER SUBSCRIPTION (FOR POSTING)
========================================================== */
async function canUserPostProperties(user) {
  // Admin bypass
  if (user.isAdmin) return { allowed: true, reason: "Admin user" };
  
  // Non-agents cannot post properties
  if (!user.isAgent) return { 
    allowed: false, 
    reason: "Only agents can post properties" 
  };
  
  // Check agent subscription
  const agent = await Agent.findById(user.id).select("subscription");
  if (!agent) return { 
    allowed: false, 
    reason: "Agent not found" 
  };
  
  if (!isSubscriptionValid(agent.subscription)) {
    return { 
      allowed: false, 
      reason: "Subscription expired", 
      subscription: agent.subscription,
      renewRequired: true 
    };
  }
  
  return { allowed: true, reason: "Valid subscription" };
}

/* ---------------------- Ensure Upload Directories ---------------------- */
const IMAGES_DIR = "uploads/images";
const VIDEOS_DIR = "uploads/videos";

const ensureDir = (p) => {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
};
ensureDir(IMAGES_DIR);
ensureDir(VIDEOS_DIR);

/* ------------------------- Multer Setup ------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "video") cb(null, VIDEOS_DIR);
    else cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) =>
    cb(
      null,
      Date.now() +
        "-" +
        Math.floor(Math.random() * 1e9) +
        path.extname(file.originalname)
    ),
});

const upload = multer({ storage });

/* ------------------------- Helpers ------------------------- */
function safeDelete(relPath) {
  try {
    if (!relPath) return;
    const abs = path.join(process.cwd(), relPath.replace(/^\//, ""));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {
    // ignore
  }
}

/* ===========================================================
   1️⃣ AGENT DASHBOARD LIST (SHOW ALL OWN PROPERTIES)
   =========================================================== */
router.get("/agent/dashboard/list", auth, async (req, res) => {
  try {
    if (!req.user.isAgent && !req.user.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const properties = await Property.find({
      $or: [{ agent: req.user.id }, { owner: req.user.id }],
    })
      .populate("agent", "_id name email subscription")
      .populate("owner", "_id name email")
      .sort({ createdAt: -1 });

    res.json(properties);
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Dashboard error" });
  }
});

/* ===========================================================
   2️⃣ CREATE PROPERTY (SUBSCRIPTION REQUIRED)
   =========================================================== */
router.post(
  "/",
  auth,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log("🔍 User posting property:", {
        id: req.user.id,
        role: req.user.role,
        isAdmin: req.user.isAdmin,
        isAgent: req.user.isAgent,
        isService: req.user.isService
      });

      // ⭐ UPDATED: Allow admin to post properties
      if (!req.user.isAgent && !req.user.isService) {
        return res.status(403).json({
          error: "Only agents or service providers can post properties",
          userType: req.user.role
        });
      }

      // Check if user can post properties (subscription check)
      // ⭐ For admin, bypass subscription check or handle differently
      let canPost;
      
      if (req.user.isAdmin) {
        // Admin can always post (or check special admin subscription)
        canPost = { allowed: true, reason: "Admin user" };
      } else {
        // Regular users need subscription check
        canPost = await canUserPostProperties(req.user);
      }
      
      if (!canPost.allowed) {
        return res.status(403).json({
          error: canPost.reason,
          renewRequired: canPost.renewRequired || false,
          subscription: canPost.subscription
        });
      }

      // Validate required fields
      if (!req.body.title || req.body.title.trim() === "") {
        return res.status(400).json({ error: "Title is required" });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;

// ✅ Process images
const images = (req.files?.images || []).map(
  (f) => `${baseUrl}/${IMAGES_DIR}/${f.filename}`
);

// ✅ Process video
const videoUrl =
  req.files?.video?.[0]
    ? `${baseUrl}/${VIDEOS_DIR}/${req.files.video[0].filename}`
    : null;

      // Process location
      let location;
      if (req.body.location) {
        try {
          const loc =
            typeof req.body.location === "string"
              ? JSON.parse(req.body.location)
              : req.body.location;
          if (loc?.lng && loc?.lat) {
            location = {
              type: "Point",
              coordinates: [Number(loc.lng), Number(loc.lat)],
            };
          }
        } catch {}
      }

      // ⭐ FIX: Handle admin users
      let ownerId = req.user.id;
      let ownerType = "Agent"; // Default
      
      if (req.user.isAdmin) {
        ownerType = "Admin";
        console.log("👑 Admin posting property as:", {
          ownerId: ownerId,
          ownerType: ownerType,
          name: req.user.name
        });
      } else if (req.user.isAgent) {
        ownerType = "Agent";
      } else if (req.user.isService) {
        ownerType = "ServiceProvider";
      }

      // Create property
      const property = new Property({
        title: req.body.title,
        description: req.body.description || "",
        listingType: req.body.listingType || "Sell",
        areaName: req.body.areaName || "",
        city: req.body.city || "",
        price: Number(req.body.price) || 0,
        address: req.body.address || "",
        nearestPlace: req.body.nearestPlace || "",
        nearbyHighway: req.body.nearbyHighway || "",
        projectName: req.body.projectName || "",
        images,
        videoUrl,
        location,
        active: true,
        owner: ownerId,
        ownerType: ownerType, // ⭐ Include owner type
        agent: req.user.isAgent || req.user.isAdmin ? req.user.id : null,
        createdBy: req.user.originalId || req.user.id, // Track who created it
        createdByRole: req.user.role,
        subscriptionValid: true,
        postedAt: new Date(),
      });

      await property.save();
      
      console.log("✅ Property posted successfully by:", req.user.role);
      
      res.json({ 
        success: true,
        message: "Property posted successfully!", 
        property 
      });
    } catch (err) {
      console.error("Post property failed:", err);
      res.status(500).json({ error: "Post property failed" });
    }
  }
);
/* ===========================================================
   3️⃣ GET ALL ACTIVE PROPERTIES (PUBLIC — FILTER EXPIRED AGENTS)
   =========================================================== */
router.get("/", async (req, res) => {
  try {
    const { city, areaName, search, showAll = false } = req.query;

    // Build base query
    const query = { active: true };

    // Apply filters
    if (city) query.city = { $regex: city, $options: "i" };
    if (areaName) query.areaName = { $regex: areaName, $options: "i" };

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { title: regex },
        { description: regex },
        { city: regex },
        { areaName: regex },
        { projectName: regex },
      ];
    }

    // Fetch properties with agent data
    const props = await Property.find(query)
      .populate({
        path: "agent",
        select: "_id name email phone subscription",
      })
      .populate("owner", "_id name email")
      .sort({ createdAt: -1 });

    // Filter out properties from agents with expired subscriptions (unless showAll flag is true)
    const filtered = props.filter(property => {
      // If property has no agent (posted by admin/owner), always show
      if (!property.agent) return true;
      
      // If showAll flag is true, show all properties regardless of subscription
      if (showAll === "true") return true;
      
      // Check agent's subscription
      const subscriptionValid = isSubscriptionValid(property.agent?.subscription);
      return subscriptionValid;
    });

    // Add subscription status to each property for frontend
    const enhancedProperties = filtered.map(property => {
      const propertyObj = property.toObject();
      
      if (property.agent) {
        propertyObj.agentSubscriptionValid = isSubscriptionValid(property.agent.subscription);
        propertyObj.agentSubscriptionExpires = property.agent.subscription?.expiresAt;
      } else {
        propertyObj.agentSubscriptionValid = true; // No agent means admin/owner post
      }
      
      return propertyObj;
    });

    res.json(enhancedProperties);
  } catch (err) {
    console.error("Failed to load properties:", err);
    res.status(500).json({ error: "Failed to load properties" });
  }
});

/* ===========================================================
   4️⃣ GET SINGLE PROPERTY (PUBLIC — FILTER EXPIRED)
   =========================================================== */
router.get("/:id", async (req, res) => {
  try {
    const property = await Property.findOne({
      _id: req.params.id,
      active: true,
    })
      .populate("agent", "_id name email phone subscription")
      .populate("owner", "_id name email");

    if (!property) {
      return res.status(404).json({ 
        error: "Property not found or has been removed" 
      });
    }

    // Check if agent's subscription is valid
    if (property.agent && !isSubscriptionValid(property.agent.subscription)) {
      return res.status(403).json({ 
        error: "This property is currently unavailable. The agent's subscription has expired.",
        subscriptionExpired: true,
        propertyId: property._id,
        agentId: property.agent._id
      });
    }

    // Add subscription info to response
    const propertyObj = property.toObject();
    if (property.agent) {
      propertyObj.agentSubscriptionValid = isSubscriptionValid(property.agent.subscription);
      propertyObj.agentSubscriptionExpires = property.agent.subscription?.expiresAt;
    }

    res.json(propertyObj);
  } catch (err) {
    console.error("Unable to load property:", err);
    res.status(500).json({ error: "Unable to load property" });
  }
});

/* ===========================================================
   5️⃣ UPDATE PROPERTY (SUBSCRIPTION REQUIRED)
   =========================================================== */
router.put(
  "/:id",
  auth,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      /* =====================================================
         🔍 Find property
      ===================================================== */
      const property = await Property.findById(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      /* =====================================================
         🔐 Ownership check
      ===================================================== */
      const isOwner = property.owner?.toString() === req.user.id;
      const isAgent = property.agent?.toString() === req.user.id;

      if (!isOwner && !isAgent && !req.user.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      /* =====================================================
         📅 Subscription check (agents only)
      ===================================================== */
      if (!req.user.isAdmin && req.user.isAgent) {
        const canPost = await canUserPostProperties(req.user);
        if (!canPost.allowed) {
          return res.status(403).json({
            error: canPost.reason,
            renewRequired: canPost.renewRequired || false,
          });
        }
      }

      /* =====================================================
         🌐 Base URL (CRITICAL FIX)
      ===================================================== */
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      /* =====================================================
         ✏️ Update basic fields
      ===================================================== */
      const fields = [
        "title",
        "description",
        "listingType",
        "areaName",
        "city",
        "price",
        "address",
        "nearestPlace",
        "nearbyHighway",
        "projectName",
      ];

      fields.forEach((field) => {
        if (req.body[field] !== undefined) {
          property[field] =
            field === "price"
              ? Number(req.body[field])
              : req.body[field];
        }
      });

      /* =====================================================
         📍 Update location
      ===================================================== */
      if (req.body.location) {
        try {
          const loc =
            typeof req.body.location === "string"
              ? JSON.parse(req.body.location)
              : req.body.location;

          if (loc?.lng && loc?.lat) {
            property.location = {
              type: "Point",
              coordinates: [Number(loc.lng), Number(loc.lat)],
            };
          }
        } catch (err) {
          console.warn("Invalid location format:", err.message);
        }
      }

      /* =====================================================
         🗑 Remove selected images
      ===================================================== */
      if (req.body.removeImages) {
        try {
          const removeIndices = Array.isArray(req.body.removeImages)
            ? req.body.removeImages.map(Number)
            : JSON.parse(req.body.removeImages);

          removeIndices.forEach((index) => {
            if (property.images[index]) {
              safeDelete(property.images[index]);
            }
          });

          property.images = property.images.filter(
            (_, index) => !removeIndices.includes(index)
          );
        } catch (err) {
          console.warn("Error parsing removeImages:", err.message);
        }
      }

      /* =====================================================
         ➕ Add new images (FIXED)
      ===================================================== */
      if (req.files?.images?.length) {
        req.files.images.forEach((file) => {
          property.images.push(
            `${baseUrl}/${IMAGES_DIR}/${file.filename}`
          );
        });
      }

      /* =====================================================
         🎥 Update video (FIXED)
      ===================================================== */
      if (req.files?.video?.length) {
        if (property.videoUrl) {
          safeDelete(property.videoUrl);
        }

        property.videoUrl =
          `${baseUrl}/${VIDEOS_DIR}/${req.files.video[0].filename}`;
      }

      /* =====================================================
         ✅ Update subscription validity flag
      ===================================================== */
      if (req.user.isAgent) {
        const agent = await Agent.findById(req.user.id).select("subscription");
        property.subscriptionValid = isSubscriptionValid(agent?.subscription);
      }

      /* =====================================================
         💾 Save & respond
      ===================================================== */
      await property.save();

      res.json({
        success: true,
        message: "Property updated successfully",
        property,
      });
    } catch (err) {
      console.error("Update failed:", err);
      res.status(500).json({ error: "Update failed" });
    }
  }
);

/* ===========================================================
   6️⃣ SOFT DELETE
   =========================================================== */
router.delete("/:id", auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: "Not found" });

    const isOwner = property.owner?.toString() === req.user.id;
    const isAgent = property.agent?.toString() === req.user.id;

    if (!isOwner && !isAgent && !req.user.isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    property.active = false;
    await property.save();

    res.json({ 
      success: true, 
      message: "Property deleted successfully" 
    });
  } catch (err) {
    console.error("Delete failed:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

/* ===========================================================
   7️⃣ GET PROPERTIES BY AGENT ID (PUBLIC — WITH SUBSCRIPTION CHECK)
   =========================================================== */
router.get("/agent/:agentId", async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Check if agent exists and has valid subscription
    const agent = await Agent.findById(agentId).select("subscription name email");
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }
    
    // Check subscription status
    const subscriptionValid = isSubscriptionValid(agent.subscription);
    if (!subscriptionValid) {
      return res.status(403).json({ 
        error: "This agent's subscription has expired. Properties are not available.",
        subscriptionExpired: true,
        agentId: agent._id
      });
    }
    
    // Get active properties for this agent
    const properties = await Property.find({
      agent: agentId,
      active: true
    })
    .populate("agent", "_id name email subscription")
    .populate("owner", "_id name email")
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      agent: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        subscriptionValid: subscriptionValid,
        subscriptionExpires: agent.subscription?.expiresAt
      },
      properties: properties,
      count: properties.length
    });
  } catch (err) {
    console.error("Failed to load agent properties:", err);
    res.status(500).json({ error: "Failed to load agent properties" });
  }
});

/* ===========================================================
   8️⃣ ADMIN: GET ALL PROPERTIES (INCLUDING EXPIRED SUBSCRIPTIONS)
   =========================================================== */
router.get("/admin/all", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const properties = await Property.find({})
      .populate("agent", "_id name email subscription")
      .populate("owner", "_id name email")
      .sort({ createdAt: -1 });

    // Add subscription status for each property
    const enhancedProperties = properties.map(property => {
      const propertyObj = property.toObject();
      
      if (property.agent) {
        propertyObj.agentSubscriptionValid = isSubscriptionValid(property.agent.subscription);
        propertyObj.agentSubscriptionExpires = property.agent.subscription?.expiresAt;
      } else {
        propertyObj.agentSubscriptionValid = true;
      }
      
      return propertyObj;
    });

    res.json(enhancedProperties);
  } catch (err) {
    console.error("Admin properties error:", err);
    res.status(500).json({ error: "Failed to load properties" });
  }
});

/* ===========================================================
   9️⃣ FILTERS & SUGGESTIONS
   =========================================================== */
router.get("/filters/cities", async (req, res) => {
  try {
    // Only include cities from properties with valid agent subscriptions
    const properties = await Property.find({ active: true })
      .populate({
        path: "agent",
        match: {
          "subscription.active": true,
          "subscription.expiresAt": { $gte: new Date() }
        },
        select: "_id"
      });
    
    // Filter properties with valid agents
    const validProperties = properties.filter(p => p.agent);
    
    // Extract unique cities
    const cities = [...new Set(validProperties.map(p => p.city).filter(c => c && c.trim() !== ""))];
    
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: "Failed to load cities" });
  }
});

router.get("/filters/areas", async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) return res.json([]);
    
    // Only include areas from properties with valid agent subscriptions
    const properties = await Property.find({ 
      city: { $regex: city, $options: "i" },
      active: true 
    })
    .populate({
      path: "agent",
      match: {
        "subscription.active": true,
        "subscription.expiresAt": { $gte: new Date() }
      },
      select: "_id"
    });
    
    // Filter properties with valid agents
    const validProperties = properties.filter(p => p.agent);
    
    // Extract unique areas
    const areas = [...new Set(validProperties.map(p => p.areaName).filter(a => a && a.trim() !== ""))];
    
    res.json(areas);
  } catch (err) {
    res.status(500).json({ error: "Failed to load areas" });
  }
});

router.get("/filters/suggestions", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === "") return res.json([]);

    const regex = new RegExp(q, "i");

    // Get properties with valid agent subscriptions
    const properties = await Property.find({
      $or: [
        { city: regex },
        { areaName: regex },
        { title: regex },
        { projectName: regex },
      ],
      active: true
    })
    .populate({
      path: "agent",
      match: {
        "subscription.active": true,
        "subscription.expiresAt": { $gte: new Date() }
      },
      select: "_id"
    })
    .limit(20);

    // Filter properties with valid agents
    const validProperties = properties.filter(p => p.agent);
    
    const suggestions = [];
    validProperties.forEach((p) => {
      if (p.city) suggestions.push({ type: "city", value: p.city });
      if (p.areaName) suggestions.push({ type: "area", value: p.areaName });
      if (p.title) suggestions.push({ type: "project", value: p.title });
      if (p.projectName) suggestions.push({ type: "project", value: p.projectName });
    });

    // Remove duplicates
    const unique = Array.from(new Set(suggestions.map(s => JSON.stringify(s))))
      .map(s => JSON.parse(s));

    res.json(unique);
  } catch (err) {
    console.error("Suggestion failed:", err);
    res.status(500).json({ error: "Suggestion failed" });
  }
});

/* ===========================================================
   🔟 GET SUBSCRIPTION STATUS FOR CURRENT USER
   =========================================================== */
router.get("/user/subscription-status", auth, async (req, res) => {
  try {
    if (!req.user.isAgent) {
      return res.json({
        isAgent: false,
        canPost: false,
        message: "Only agents can post properties"
      });
    }

    const agent = await Agent.findById(req.user.id).select("subscription name email");
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const subscriptionValid = isSubscriptionValid(agent.subscription);
    const now = new Date();
    const expiresAt = agent.subscription?.expiresAt ? new Date(agent.subscription.expiresAt) : null;
    
    let daysRemaining = null;
    if (expiresAt && expiresAt > now) {
      daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    }

    res.json({
      isAgent: true,
      canPost: subscriptionValid,
      subscription: {
        active: subscriptionValid,
        expiresAt: expiresAt,
        daysRemaining: daysRemaining,
        lastPaidAt: agent.subscription?.lastPaidAt,
        amount: agent.subscription?.amount || 1500,
        currency: agent.subscription?.currency || "INR",
        needsRenewal: !subscriptionValid || (daysRemaining !== null && daysRemaining <= 3)
      },
      agent: {
        id: agent._id,
        name: agent.name,
        email: agent.email
      }
    });
  } catch (err) {
    console.error("Subscription status error:", err);
    res.status(500).json({ error: "Failed to check subscription status" });
  }
});

module.exports = router;