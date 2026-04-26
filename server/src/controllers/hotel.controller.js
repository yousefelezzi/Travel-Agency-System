const prisma = require("../config/db");
const { searchExternalHotels, ENABLED: EXTERNAL_ENABLED } = require("../services/external-inventory.service");

// GET /api/hotels?city=&country=&checkIn=&checkOut=&maxPrice=&minRating=&page=&limit=
const searchHotels = async (req, res, next) => {
  try {
    const {
      city,
      country,
      checkIn,
      checkOut,
      guests,
      maxPrice,
      minRating,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {
      availableRooms: { gt: 0 },
    };

    if (city) where.city = { contains: city, mode: "insensitive" };
    if (country) where.country = { contains: country, mode: "insensitive" };
    if (maxPrice) where.pricePerNight = { lte: parseFloat(maxPrice) };
    if (minRating) where.starRating = { gte: parseInt(minRating) };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const wantLive = EXTERNAL_ENABLED && city;
    const livePromise = wantLive
      ? searchExternalHotels({
          city,
          country,
          checkIn,
          checkOut,
          guests: parseInt(guests || 2),
        })
      : Promise.resolve({ hotels: [], totalAvailable: 0 });

    const [liveResult, dbHotels, total] = await Promise.all([
      livePromise.catch(() => ({ hotels: [], totalAvailable: 0 })),
      prisma.hotel.findMany({
        where,
        orderBy: { pricePerNight: "asc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.hotel.count({ where }),
    ]);

    const liveHotels = liveResult.hotels || [];
    const filteredLive = liveHotels.filter((h) => {
      if (maxPrice && h.pricePerNight > parseFloat(maxPrice)) return false;
      if (minRating && h.starRating < parseInt(minRating)) return false;
      return true;
    });

    res.json({
      hotels: [...filteredLive, ...dbHotels],
      live: filteredLive.length,
      liveTotalAvailable: liveResult.totalAvailable || 0,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total + (liveResult.totalAvailable || filteredLive.length),
        totalPages: Math.ceil((total + filteredLive.length) / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/hotels/:id
const getHotelById = async (req, res, next) => {
  try {
    const hotel = await prisma.hotel.findUnique({
      where: { id: req.params.id },
    });

    if (!hotel) {
      return res.status(404).json({ error: { message: "Hotel not found" } });
    }

    res.json({ hotel });
  } catch (error) {
    next(error);
  }
};

// POST /api/hotels (Agent/Admin)
const createHotel = async (req, res, next) => {
  try {
    const hotel = await prisma.hotel.create({ data: req.body });
    res.status(201).json({ hotel });
  } catch (error) {
    next(error);
  }
};

// PUT /api/hotels/:id (Agent/Admin)
const updateHotel = async (req, res, next) => {
  try {
    const hotel = await prisma.hotel.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ hotel });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/hotels/:id (Admin)
const deleteHotel = async (req, res, next) => {
  try {
    await prisma.hotel.delete({ where: { id: req.params.id } });
    res.json({ message: "Hotel deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
};
