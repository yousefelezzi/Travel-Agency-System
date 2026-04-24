require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const prisma = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const flightRoutes = require("./routes/flight.routes");
const hotelRoutes = require("./routes/hotel.routes");
const packageRoutes = require("./routes/package.routes");
const bookingRoutes = require("./routes/booking.routes");
const favoriteRoutes = require("./routes/favorite.routes");
const paymentRoutes = require("./routes/payment.routes");
const plannerRoutes = require("./routes/planner.routes");
const chatRoutes = require("./routes/chat.routes");
const supportRoutes = require("./routes/support.routes");

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/planner", plannerRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/support", supportRoutes);

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    },
  });
});

app.listen(PORT, () => {
  console.log(`ATLAS Server running on port ${PORT}`);
});

module.exports = app;
