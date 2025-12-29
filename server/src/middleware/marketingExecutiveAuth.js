const jwt = require("jsonwebtoken");

module.exports = async function (req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "REAL_ESTATE_SECRET"
    );

    // Force marketing role
    req.user = {
      id: decoded.id,
      meid: decoded.meid,
      role: "marketing"
    };

    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized" });
  }
};
