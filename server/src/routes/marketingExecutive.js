const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const MarketingExecutive = require("../models/MarketingExecutive");
const Agent = require("../models/Agent");
const ServiceProvider = require("../models/ServiceProvider");
const { auth} = require("../middleware/auth");

const router = express.Router();
const crypto = require("crypto");
const sendMail = require("../utils/sendMail");
/* ===========================================================
   REGISTER MARKETING EXECUTIVE
=========================================================== */
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const exists = await MarketingExecutive.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email already exists" });

    const exec = await MarketingExecutive.create({
      name,
      email: email.toLowerCase().trim(),
      phone,
      password, // ✅ plain password ONLY
    });

    res.json({
      success: true,
      message: "Marketing Executive Registered Successfully",
      executive: {
        id: exec._id,
        name: exec.name,
        email: exec.email,
        phone: exec.phone,
        meid: exec.meid,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

/* ===========================================================
   LOGIN MARKETING EXECUTIVE
=========================================================== */
// In your login route
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });

    email = email.trim().toLowerCase();

    const exec = await MarketingExecutive.findOne({ email });
    if (!exec) return res.status(400).json({ message: "Invalid Email" });

    const isMatch = await bcrypt.compare(password, exec.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect Password" });

    // ⭐ FIXED: Use consistent role name
    const token = jwt.sign(
      {
        id: exec._id,
        role: "marketingExecutive",  // This MUST match auth middleware
        meid: exec.meid,
        email: exec.email
      },
      process.env.JWT_SECRET || "REAL_ESTATE_SECRET",
      { expiresIn: "7d" }
    );

    // Remove password from response
    const execWithoutPassword = exec.toObject();
    delete execWithoutPassword.password;

    res.json({
      success: true,
      message: "Login Success",
      token,
      exec: execWithoutPassword
    });
  } catch (err) {
    console.error("ME LOGIN ERROR:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

/* ===========================================================
   GET ME PROFILE
=========================================================== */
router.get("/me", auth, async (req, res) => {
  try {
    const exec = await MarketingExecutive.findById(req.user.id).select(
      "-password"
    );
    res.json({ success: true, executive: exec });
  } catch (err) {
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.get("/admin/referrals", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: "Admin only" });
    const list = await ServiceProvider.find().select("name email serviceCategory status referral referralAgent referralMarketingExecutiveName referralMarketingExecutiveId createdAt").populate("referralAgent", "name email");
    res.json(list);
  } catch (err) {
    console.error("ADMIN REFERRALS ERROR:", err);
    res.status(500).json({ error: "Failed to load referrals" });
  }
});


/* ===========================================================
   GET AGENTS REFERRED BY THIS ME
=========================================================== */
/* ===========================================================
   GET AGENTS REFERRED BY THIS ME (FIXED)
=========================================================== */
router.get("/my-referred-agents", auth, async (req, res) => {
  try {
    console.log("🔍 Fetching agents for ME ID:", req.user.meid);
    
    // ⭐ FIXED: Only find agents where:
    // 1. referralMarketingExecutiveId exists AND is not empty
    // 2. referralMarketingExecutiveId matches the logged-in ME's ID
    const agents = await Agent.find({
      referralMarketingExecutiveId: { 
        $exists: true, 
        $ne: "", // Exclude empty strings
        $eq: req.user.meid 
      }
    }).select(
      "agentId name email phone profession referralMarketingExecutiveName referralMarketingExecutiveId createdAt"
    );

    console.log("🔍 Found referred agents:", agents.length);
    
    res.json({
      success: true,
      count: agents.length,
      agents,
    });
  } catch (err) {
    console.error("ME Referral Agent Error:", err);
    res.status(500).json({ error: "Failed to fetch referred agents" });
  }
});
/* ===========================================================
   ✅ FORGOT PASSWORD (ME)
   =========================================================== */
router.post("/forgot-password", async (req, res) => {
  try {
    console.log("ME FORGOT BODY:", req.body);

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const exec = await MarketingExecutive.findOne({ email });

    if (!exec) {
      return res.status(404).json({ error: "Email not registered" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    exec.resetToken = token;
    exec.resetTokenExpiry = Date.now() + 15 * 60 * 1000;

    await exec.save(); // 🔥 THIS WAS FAILING BEFORE

    const resetLink =
  `${process.env.CLIENT_URL}/marketing-reset-password/${token}`;

    console.log("✅ ME RESET LINK:", resetLink);
     await sendMail({
      to: exec.email,
      subject: "Marketing Executive Password Reset",
      html: `
        <h3>Password Reset</h3>
        <p>Click below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Link expires in 15 minutes.</p>
      `,
    });
    // ✅ ✅ END EMAIL BLOCK


    res.json({
      success: true,
      message: "Reset link sent to your email",
    });
  } catch (err) {
    console.error("❌ ME FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===========================================================
   ✅ RESET PASSWORD (ME)
   =========================================================== */
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password)
      return res.status(400).json({ error: "Password required" });

    const exec = await MarketingExecutive.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!exec)
      return res.status(400).json({ error: "Invalid or expired token" });

    exec.password = password; // ✅ auto-hashed
    exec.resetToken = undefined;
    exec.resetTokenExpiry = undefined;

    await exec.save();

    res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (err) {
    console.error("ME RESET PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});



/* ===========================================================
   GET SERVICE PROVIDERS REFERRED BY THIS ME
=========================================================== */
router.get("/my-referred-providers", auth, async (req, res) => {
  try {
    const providers = await ServiceProvider.find({
      referralMarketingExecutiveId: req.user.meid,
    })
   .select(
      "name email phone serviceCategory serviceTypes referralMarketingExecutiveName referralMarketingExecutiveId createdAt"
    );  // ⭐ ADDED serviceTypes
    res.json({
      success: true,
      count: providers.length,
      providers,
    });
  } catch (err) {
    console.error("ME Provider Referral Error:", err);
    res.status(500).json({ error: "Failed to fetch referred providers" });
  }
});


router.get("/admin/list", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    const executives = await MarketingExecutive.find().select("-password");

    const final = [];

    for (const exec of executives) {
      const agentCount = await Agent.countDocuments({
        referralMarketingExecutiveId: exec.meid,
      });

      const providerCount = await ServiceProvider.countDocuments({
        referralMarketingExecutiveId: exec.meid,
      });

      final.push({
        _id: exec._id,
        name: exec.name,
        email: exec.email,
        phone: exec.phone,
        meid: exec.meid,
        joined: exec.createdAt,
        referredAgents: agentCount,
        referredProviders: providerCount
      });
    }

    res.json(final);

  } catch (err) {
    console.error("ME ADMIN LIST ERROR:", err);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/validate/:meid", async (req, res) => {
  try {
    const { meid } = req.params;

    const exec = await MarketingExecutive.findOne({ meid });

    if (!exec) {
      return res.status(404).json({ valid: false });
    }

    res.json({
      valid: true,
      name: exec.name,
      email: exec.email,
    });
  } catch (err) {
    res.status(500).json({ valid: false });
  }
});




module.exports = router;
