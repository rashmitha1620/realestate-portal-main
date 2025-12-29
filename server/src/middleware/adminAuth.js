const jwt = require("jsonwebtoken");

const adminAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "REAL_ESTATE_SECRET"
    );

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Admin access only" });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid/Expired token" });
  }
};

module.exports = adminAuth;
