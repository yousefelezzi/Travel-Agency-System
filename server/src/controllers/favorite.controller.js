const prisma = require("../config/db");

// GET /api/favorites
const getMyFavorites = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id },
    });

    const favorites = await prisma.favorite.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
    });

    // Fetch details for each favorite
    const detailed = await Promise.all(
      favorites.map(async (fav) => {
        let detail = null;
        if (fav.flightId) detail = await prisma.flight.findUnique({ where: { id: fav.flightId } });
        if (fav.hotelId) detail = await prisma.hotel.findUnique({ where: { id: fav.hotelId } });
        if (fav.packageId) detail = await prisma.package.findUnique({ where: { id: fav.packageId } });
        return { ...fav, detail };
      })
    );

    res.json({ favorites: detailed });
  } catch (error) {
    next(error);
  }
};

// POST /api/favorites
const addFavorite = async (req, res, next) => {
  try {
    const { flightId, hotelId, packageId } = req.body;
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id },
    });

    const favorite = await prisma.favorite.create({
      data: {
        customerId: customer.id,
        flightId: flightId || null,
        hotelId: hotelId || null,
        packageId: packageId || null,
      },
    });

    res.status(201).json({ favorite });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/favorites/:id
const removeFavorite = async (req, res, next) => {
  try {
    await prisma.favorite.delete({ where: { id: req.params.id } });
    res.json({ message: "Removed from favorites" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyFavorites, addFavorite, removeFavorite };
