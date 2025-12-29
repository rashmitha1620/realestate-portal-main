module.exports = (err, req, res, next) => {
  console.error("❌ ERROR:", err);

  // ✅ Default values
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";

  // ✅ Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map(e => e.message)
      .join(", ");
  }

  // ✅ Duplicate key error (email already exists, etc.)
  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value entered";
  }

  // ✅ JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};
