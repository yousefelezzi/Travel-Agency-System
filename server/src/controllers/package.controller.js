const prisma = require("../config/db");

// GET /api/packages?maxPrice=&search=&page=&limit=
const browsePackages = async (req, res, next) => {
  try {
    const { maxPrice, search, page = 1, limit = 20 } = req.query;

    const where = {
      isPublished: true,
    };

    if (maxPrice) where.price = { lte: parseFloat(maxPrice) };
    if (search) {
      where.OR = [
        { packageName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [packages, total] = await Promise.all([
      prisma.package.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.package.count({ where }),
    ]);

    res.json({
      packages,
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

// GET /api/packages/:id
const getPackageById = async (req, res, next) => {
  try {
    const pkg = await prisma.package.findUnique({
      where: { id: req.params.id },
    });

    if (!pkg) {
      return res.status(404).json({ error: { message: "Package not found" } });
    }

    res.json({ package: pkg });
  } catch (error) {
    next(error);
  }
};

// GET /api/packages/manage/all — Agent view (includes unpublished)
const getAllPackages = async (req, res, next) => {
  try {
    const packages = await prisma.package.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ packages });
  } catch (error) {
    next(error);
  }
};

// POST /api/packages (Agent/Admin)
const createPackage = async (req, res, next) => {
  try {
    const {
      packageName,
      description,
      services,
      price,
      discount,
      isPublished,
      startDate,
      endDate,
    } = req.body;

    const pkg = await prisma.package.create({
      data: {
        packageName,
        description,
        services: services || [],
        price: parseFloat(price),
        discount: discount ? parseFloat(discount) : 0,
        isPublished: isPublished || false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    res.status(201).json({ package: pkg });
  } catch (error) {
    next(error);
  }
};

// PUT /api/packages/:id (Agent/Admin)
const updatePackage = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.price) data.price = parseFloat(data.price);
    if (data.discount) data.discount = parseFloat(data.discount);
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const pkg = await prisma.package.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ package: pkg });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/packages/:id/publish (Agent/Admin)
const togglePublish = async (req, res, next) => {
  try {
    const pkg = await prisma.package.findUnique({
      where: { id: req.params.id },
    });

    if (!pkg) {
      return res.status(404).json({ error: { message: "Package not found" } });
    }

    const updated = await prisma.package.update({
      where: { id: req.params.id },
      data: { isPublished: !pkg.isPublished },
    });

    res.json({
      package: updated,
      message: updated.isPublished
        ? "Package published"
        : "Package unpublished",
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/packages/:id (Admin)
const deletePackage = async (req, res, next) => {
  try {
    await prisma.package.delete({ where: { id: req.params.id } });
    res.json({ message: "Package deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  browsePackages,
  getPackageById,
  getAllPackages,
  createPackage,
  updatePackage,
  togglePublish,
  deletePackage,
};
