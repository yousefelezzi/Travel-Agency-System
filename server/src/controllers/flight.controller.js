const prisma = require("../config/db");

// GET /api/flights?from=&to=&date=&maxPrice=&passengers=&page=&limit=
const searchFlights = async (req, res, next) => {
  try {
    const {
      from,
      to,
      date,
      maxPrice,
      passengers = 1,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {
      availableSeats: { gte: parseInt(passengers) },
    };

    if (from) where.departurePort = { contains: from, mode: "insensitive" };
    if (to) where.arrivalPort = { contains: to, mode: "insensitive" };
    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.departureDate = { gte: searchDate, lt: nextDay };
    }
    if (maxPrice) where.economyPrice = { lte: parseFloat(maxPrice) };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [flights, total] = await Promise.all([
      prisma.flight.findMany({
        where,
        orderBy: { economyPrice: "asc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.flight.count({ where }),
    ]);

    res.json({
      flights,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/flights/airports
const listAirports = async (_req, res, next) => {
  try {
    const [deps, arrs] = await Promise.all([
      prisma.flight.findMany({ distinct: ["departurePort"], select: { departurePort: true } }),
      prisma.flight.findMany({ distinct: ["arrivalPort"], select: { arrivalPort: true } }),
    ]);
    const set = new Set();
    deps.forEach((d) => set.add(d.departurePort));
    arrs.forEach((a) => set.add(a.arrivalPort));
    res.json({ airports: [...set].sort() });
  } catch (error) {
    next(error);
  }
};

// GET /api/flights/:id
const getFlightById = async (req, res, next) => {
  try {
    const flight = await prisma.flight.findUnique({
      where: { id: req.params.id },
    });

    if (!flight) {
      return res.status(404).json({ error: { message: "Flight not found" } });
    }

    res.json({ flight });
  } catch (error) {
    next(error);
  }
};

// POST /api/flights (Agent/Admin only)
const createFlight = async (req, res, next) => {
  try {
    const flight = await prisma.flight.create({ data: req.body });
    res.status(201).json({ flight });
  } catch (error) {
    next(error);
  }
};

// PUT /api/flights/:id (Agent/Admin only)
const updateFlight = async (req, res, next) => {
  try {
    const flight = await prisma.flight.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ flight });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/flights/:id (Admin only)
const deleteFlight = async (req, res, next) => {
  try {
    await prisma.flight.delete({ where: { id: req.params.id } });
    res.json({ message: "Flight deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchFlights,
  listAirports,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
};
