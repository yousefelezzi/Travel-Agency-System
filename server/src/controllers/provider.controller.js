const crypto = require("crypto");
const prisma = require("../config/db");

// ─── Admin-side: provision providers + their API keys ────────────────

// GET /api/admin/providers
const listProviders = async (req, res, next) => {
  try {
    const providers = await prisma.provider.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { inventoryLogs: true } } },
    });
    res.json({
      providers: providers.map((p) => ({
        ...p,
        apiKeyMasked: p.apiKey ? `••••${p.apiKey.slice(-6)}` : "—",
        // Don't ship the raw key on list responses
        apiKey: undefined,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/providers  { name, contactEmail, type }
// Issues a new random API key the provider must use to authenticate.
const createProvider = async (req, res, next) => {
  try {
    const { name, contactEmail, type } = req.body || {};
    if (!name || !contactEmail || !type) {
      return res.status(400).json({
        error: { message: "name, contactEmail, and type are required." },
      });
    }
    if (!["AIRLINE", "HOTEL", "TOUR_OPERATOR"].includes(type)) {
      return res
        .status(400)
        .json({ error: { message: "type must be AIRLINE, HOTEL, or TOUR_OPERATOR." } });
    }
    const apiKey = `prov_${crypto.randomBytes(20).toString("hex")}`;
    const provider = await prisma.provider.create({
      data: { name, contactEmail, type, apiKey },
    });
    // Return the plaintext key ONCE so the admin can hand it to the provider.
    res.status(201).json({ provider });
  } catch (err) {
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ error: { message: "Provider name already exists." } });
    }
    next(err);
  }
};

// PUT /api/admin/providers/:id  { isActive?, contactEmail? }
const updateProvider = async (req, res, next) => {
  try {
    const data = {};
    if (typeof req.body.isActive === "boolean") data.isActive = req.body.isActive;
    if (req.body.contactEmail) data.contactEmail = req.body.contactEmail;
    const provider = await prisma.provider.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ provider: { ...provider, apiKey: undefined } });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/providers/:id/rotate-key
const rotateProviderKey = async (req, res, next) => {
  try {
    const apiKey = `prov_${crypto.randomBytes(20).toString("hex")}`;
    const provider = await prisma.provider.update({
      where: { id: req.params.id },
      data: { apiKey },
    });
    res.json({ provider });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/providers/:id/logs
const getProviderLogs = async (req, res, next) => {
  try {
    const logs = await prisma.providerInventoryLog.findMany({
      where: { providerId: req.params.id },
      orderBy: { receivedAt: "desc" },
      take: 50,
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
};

// ─── Provider-side: submit inventory + view bookings ─────────────────

// Validate one row of incoming inventory based on provider type.
function validateInventoryRow(type, row) {
  const errors = [];
  if (!row || typeof row !== "object") {
    return ["Row is not an object."];
  }

  if (type === "AIRLINE") {
    if (!row.flightNumber) errors.push("flightNumber required");
    if (!row.airlineName) errors.push("airlineName required");
    if (!row.departureDate) errors.push("departureDate required");
    if (!row.departurePort) errors.push("departurePort required");
    if (!row.arrivalDate) errors.push("arrivalDate required");
    if (!row.arrivalPort) errors.push("arrivalPort required");
    if (row.economyPrice == null || isNaN(Number(row.economyPrice)))
      errors.push("economyPrice required (number)");
    if (row.totalSeats == null || isNaN(parseInt(row.totalSeats)))
      errors.push("totalSeats required (integer)");
    if (row.availableSeats == null || isNaN(parseInt(row.availableSeats)))
      errors.push("availableSeats required (integer)");
  } else if (type === "HOTEL") {
    if (!row.name) errors.push("name required");
    if (!row.city) errors.push("city required");
    if (!row.country) errors.push("country required");
    if (row.pricePerNight == null || isNaN(Number(row.pricePerNight)))
      errors.push("pricePerNight required (number)");
    if (row.totalRooms == null || isNaN(parseInt(row.totalRooms)))
      errors.push("totalRooms required (integer)");
    if (row.availableRooms == null || isNaN(parseInt(row.availableRooms)))
      errors.push("availableRooms required (integer)");
  } else if (type === "TOUR_OPERATOR") {
    if (!row.packageName) errors.push("packageName required");
    if (row.price == null || isNaN(Number(row.price)))
      errors.push("price required (number)");
  }

  return errors;
}

// POST /api/provider/inventory  { items: [...] }
// The provider sends a batch; we validate, persist accepted rows, log everything.
const submitInventory = async (req, res, next) => {
  try {
    const provider = req.provider; // attached by middleware
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      const log = await prisma.providerInventoryLog.create({
        data: {
          providerId: provider.id,
          payload: req.body || {},
          status: "REJECTED",
          errors: ["items array is required and must not be empty"],
        },
      });
      return res.status(400).json({
        accepted: 0,
        rejected: 0,
        errors: log.errors,
        logId: log.id,
      });
    }

    const rowResults = items.map((row, i) => ({
      index: i,
      row,
      errors: validateInventoryRow(provider.type, row),
    }));

    const valid = rowResults.filter((r) => r.errors.length === 0);
    const invalid = rowResults.filter((r) => r.errors.length > 0);

    let acceptedCount = 0;
    if (valid.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const { row } of valid) {
          if (provider.type === "AIRLINE") {
            // Upsert by flightNumber so re-submissions update availability/pricing.
            await tx.flight.upsert({
              where: { flightNumber: row.flightNumber },
              update: {
                airlineName: row.airlineName,
                aircraftType: row.aircraftType || null,
                departureDate: new Date(row.departureDate),
                departurePort: row.departurePort,
                arrivalDate: new Date(row.arrivalDate),
                arrivalPort: row.arrivalPort,
                economyPrice: Number(row.economyPrice),
                businessPrice: row.businessPrice != null ? Number(row.businessPrice) : null,
                totalSeats: parseInt(row.totalSeats),
                availableSeats: parseInt(row.availableSeats),
              },
              create: {
                flightNumber: row.flightNumber,
                airlineName: row.airlineName,
                aircraftType: row.aircraftType || null,
                departureDate: new Date(row.departureDate),
                departurePort: row.departurePort,
                arrivalDate: new Date(row.arrivalDate),
                arrivalPort: row.arrivalPort,
                economyPrice: Number(row.economyPrice),
                businessPrice: row.businessPrice != null ? Number(row.businessPrice) : null,
                totalSeats: parseInt(row.totalSeats),
                availableSeats: parseInt(row.availableSeats),
              },
            });
            acceptedCount += 1;
          } else if (provider.type === "HOTEL") {
            // Hotels don't have a unique business key in the schema, so
            // we look up by (name + city) and update or create.
            const existing = await tx.hotel.findFirst({
              where: { name: row.name, city: row.city },
            });
            if (existing) {
              await tx.hotel.update({
                where: { id: existing.id },
                data: {
                  country: row.country,
                  address: row.address || existing.address,
                  starRating: row.starRating != null ? parseInt(row.starRating) : existing.starRating,
                  description: row.description || existing.description,
                  pricePerNight: Number(row.pricePerNight),
                  totalRooms: parseInt(row.totalRooms),
                  availableRooms: parseInt(row.availableRooms),
                },
              });
            } else {
              await tx.hotel.create({
                data: {
                  name: row.name,
                  city: row.city,
                  country: row.country,
                  address: row.address || null,
                  starRating: row.starRating != null ? parseInt(row.starRating) : null,
                  description: row.description || null,
                  pricePerNight: Number(row.pricePerNight),
                  totalRooms: parseInt(row.totalRooms),
                  availableRooms: parseInt(row.availableRooms),
                },
              });
            }
            acceptedCount += 1;
          } else if (provider.type === "TOUR_OPERATOR") {
            const existing = await tx.package.findFirst({
              where: { packageName: row.packageName },
            });
            if (existing) {
              await tx.package.update({
                where: { id: existing.id },
                data: {
                  description: row.description || existing.description,
                  services: Array.isArray(row.services) ? row.services : existing.services,
                  price: Number(row.price),
                  discount: row.discount != null ? Number(row.discount) : existing.discount,
                  isPublished: typeof row.isPublished === "boolean" ? row.isPublished : existing.isPublished,
                  startDate: row.startDate ? new Date(row.startDate) : existing.startDate,
                  endDate: row.endDate ? new Date(row.endDate) : existing.endDate,
                },
              });
            } else {
              await tx.package.create({
                data: {
                  packageName: row.packageName,
                  description: row.description || null,
                  services: Array.isArray(row.services) ? row.services : [],
                  price: Number(row.price),
                  discount: row.discount != null ? Number(row.discount) : 0,
                  isPublished: !!row.isPublished,
                  startDate: row.startDate ? new Date(row.startDate) : null,
                  endDate: row.endDate ? new Date(row.endDate) : null,
                },
              });
            }
            acceptedCount += 1;
          }
        }
      });
    }

    const status = invalid.length === 0 ? "ACCEPTED" : valid.length === 0 ? "REJECTED" : "PARTIAL";
    const log = await prisma.providerInventoryLog.create({
      data: {
        providerId: provider.id,
        payload: { count: items.length },
        status,
        errors: invalid.flatMap((i) => i.errors.map((e) => `row[${i.index}]: ${e}`)),
      },
    });

    res.status(invalid.length === 0 ? 200 : 207).json({
      accepted: acceptedCount,
      rejected: invalid.length,
      errors: log.errors,
      logId: log.id,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/provider/me — for providers to verify their key works
const whoAmI = async (req, res) => {
  res.json({
    provider: {
      id: req.provider.id,
      name: req.provider.name,
      type: req.provider.type,
      isActive: req.provider.isActive,
    },
  });
};

// GET /api/provider/bookings — bookings that include this provider's
// inventory (TC_057 — providers can pull recent bookings for their items).
const getProviderBookings = async (req, res, next) => {
  try {
    const provider = req.provider;
    let bookings;

    if (provider.type === "AIRLINE") {
      bookings = await prisma.booking.findMany({
        where: {
          status: { in: ["CONFIRMED", "MODIFIED"] },
          items: {
            some: {
              flight: { airlineName: provider.name },
            },
          },
        },
        include: {
          customer: { include: { user: { select: { email: true } } } },
          items: { include: { flight: true } },
          passengers: true,
        },
        orderBy: { bookingDate: "desc" },
        take: 100,
      });
    } else if (provider.type === "HOTEL") {
      bookings = await prisma.booking.findMany({
        where: {
          status: { in: ["CONFIRMED", "MODIFIED"] },
          items: { some: { hotel: { name: provider.name } } },
        },
        include: {
          customer: { include: { user: { select: { email: true } } } },
          items: { include: { hotel: true } },
          passengers: true,
        },
        orderBy: { bookingDate: "desc" },
        take: 100,
      });
    } else {
      bookings = await prisma.booking.findMany({
        where: {
          status: { in: ["CONFIRMED", "MODIFIED"] },
          items: { some: { package: {} } },
        },
        include: {
          customer: { include: { user: { select: { email: true } } } },
          items: { include: { package: true } },
          passengers: true,
        },
        orderBy: { bookingDate: "desc" },
        take: 100,
      });
    }

    res.json({ bookings });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  // admin-side
  listProviders,
  createProvider,
  updateProvider,
  rotateProviderKey,
  getProviderLogs,
  // provider-side
  submitInventory,
  whoAmI,
  getProviderBookings,
};
