const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: { message: "No token provided" } });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ error: { message: "Invalid or deactivated account" } });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: { message: "Token expired" } });
    }
    return res.status(401).json({ error: { message: "Invalid token" } });
  }
};

// Role-based access control (doc: Layer 1 - Roles & Access Control)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: { message: "Insufficient permissions" } });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
