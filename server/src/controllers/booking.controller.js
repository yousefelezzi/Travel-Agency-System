const prisma = require("../config/db");

// POST /api/bookings
// Body: { items: [{ type, id, seatClass?, checkIn?, checkOut?, quantity? }], passengers: [...] }
const createBooking = async (req, res, next) => {
  try {
    const { items, passengers } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ error: { message: "At least one booking item is required." } });
    }

    if (!passengers || passengers.length === 0) {
      return res
        .status(400)
        .json({ error: { message: "At least one passenger is required." } });
    }

    // Get customer profile
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id },
    });

    if (!customer) {
      return res
        .status(400)
        .json({ error: { message: "Customer profile not found." } });
    }

    // Validate availability and calculate total
    let totalAmount = 0;
    const bookingItemsData = [];

    for (const item of items) {
      if (item.type === "flight") {
        const flight = await prisma.flight.findUnique({
          where: { id: item.id },
        });
        if (!flight) {
          return res.status(404).json({
            error: { message: `Flight ${item.id} not found.` },
          });
        }
        const qty = item.quantity || 1;
        if (flight.availableSeats < qty) {
          return res.status(409).json({
            error: {
              message: `Flight ${flight.flightNumber} is no longer available for ${qty} passengers.`,
            },
          });
        }
        const price =
          item.seatClass === "business" && flight.businessPrice
            ? Number(flight.businessPrice)
            : Number(flight.economyPrice);
        totalAmount += price * qty;
        bookingItemsData.push({
          flightId: flight.id,
          seatClass: item.seatClass || "economy",
          quantity: qty,
          unitPrice: price,
        });
      } else if (item.type === "hotel") {
        const hotel = await prisma.hotel.findUnique({
          where: { id: item.id },
        });
        if (!hotel) {
          return res.status(404).json({
            error: { message: `Hotel ${item.id} not found.` },
          });
        }
        if (hotel.availableRooms < 1) {
          return res.status(409).json({
            error: { message: `Hotel ${hotel.name} has no available rooms.` },
          });
        }
        if (!item.checkIn || !item.checkOut) {
          return res.status(400).json({
            error: { message: "Check-in and check-out dates are required for hotels." },
          });
        }
        const nights = Math.ceil(
          (new Date(item.checkOut) - new Date(item.checkIn)) / (1000 * 60 * 60 * 24)
        );
        const price = Number(hotel.pricePerNight) * nights;
        totalAmount += price;
        bookingItemsData.push({
          hotelId: hotel.id,
          checkIn: new Date(item.checkIn),
          checkOut: new Date(item.checkOut),
          quantity: 1,
          unitPrice: price,
        });
      } else if (item.type === "package") {
        const pkg = await prisma.package.findUnique({
          where: { id: item.id },
        });
        if (!pkg || !pkg.isPublished) {
          return res.status(404).json({
            error: { message: `Package ${item.id} not found or not available.` },
          });
        }
        const qty = item.quantity || 1;
        const discountedPrice =
          Number(pkg.price) * (1 - Number(pkg.discount) / 100);
        totalAmount += discountedPrice * qty;
        bookingItemsData.push({
          packageId: pkg.id,
          quantity: qty,
          unitPrice: discountedPrice,
        });
      }
    }

    // Create booking with items and passengers in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          customerId: customer.id,
          numberOfPersons: passengers.length,
          totalAmount,
          discount: 0,
          status: "PENDING",
          items: {
            create: bookingItemsData,
          },
          passengers: {
            create: passengers.map((p) => ({
              firstName: p.firstName,
              middleName: p.middleName || null,
              lastName: p.lastName,
              dateOfBirth: new Date(p.dateOfBirth),
              passportNumber: p.passportNumber || null,
              nationality: p.nationality || null,
              passportExpiry: p.passportExpiry
                ? new Date(p.passportExpiry)
                : null,
              seatPreference: p.seatPreference || null,
              specialRequests: p.specialRequests || [],
              travelerId: p.travelerId || null,
            })),
          },
        },
        include: {
          items: true,
          passengers: true,
        },
      });

      // Decrement availability for flights
      for (const item of bookingItemsData) {
        if (item.flightId) {
          await tx.flight.update({
            where: { id: item.flightId },
            data: {
              availableSeats: { decrement: item.quantity },
            },
          });
        }
        if (item.hotelId) {
          await tx.hotel.update({
            where: { id: item.hotelId },
            data: {
              availableRooms: { decrement: 1 },
            },
          });
        }
      }

      return newBooking;
    });

    // Fetch complete booking with invoice
    const fullBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        items: {
          include: { flight: true, hotel: true, package: true },
        },
        passengers: true,
        invoice: true,
      },
    });

    res.status(201).json({
      message: "Booking created. Awaiting payment.",
      booking: fullBooking,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings (customer's bookings)
const getMyBookings = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id },
    });

    if (!customer) {
      return res.status(400).json({ error: { message: "Customer profile not found." } });
    }

    const bookings = await prisma.booking.findMany({
      where: { customerId: customer.id },
      include: {
        items: {
          include: { flight: true, hotel: true, package: true },
        },
        invoice: true,
      },
      orderBy: { bookingDate: "desc" },
    });

    res.json({ bookings });
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings/:id
const getBookingById = async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: { flight: true, hotel: true, package: true },
        },
        passengers: true,
        payments: true,
        invoice: true,
      },
    });

    if (!booking) {
      return res
        .status(404)
        .json({ error: { message: "Booking not found." } });
    }

    // Customers can only see their own bookings
    if (req.user.role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.id },
      });
      if (booking.customerId !== customer.id) {
        return res
          .status(403)
          .json({ error: { message: "Access denied." } });
      }
    }

    res.json({ booking });
  } catch (error) {
    next(error);
  }
};

// POST /api/bookings/:id/cancel
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!booking) {
      return res
        .status(404)
        .json({ error: { message: "Booking not found." } });
    }

    // Ownership check for customers
    if (req.user.role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.id },
      });
      if (booking.customerId !== customer.id) {
        return res
          .status(403)
          .json({ error: { message: "Access denied." } });
      }
    }

    if (booking.status === "CANCELLED") {
      return res
        .status(400)
        .json({ error: { message: "Booking is already cancelled." } });
    }

    // Calculate cancellation fee (simple policy: 20% default)
    const cancellationFeePercent = 20;
    const cancellationFee =
      Number(booking.totalAmount) * (cancellationFeePercent / 100);
    const refundAmount = Number(booking.totalAmount) - cancellationFee;

    // Cancel and restore availability
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED" },
      });

      for (const item of booking.items) {
        if (item.flightId) {
          await tx.flight.update({
            where: { id: item.flightId },
            data: { availableSeats: { increment: item.quantity } },
          });
        }
        if (item.hotelId) {
          await tx.hotel.update({
            where: { id: item.hotelId },
            data: { availableRooms: { increment: 1 } },
          });
        }
      }
    });

    res.json({
      message: "Booking cancelled.",
      cancellationFee,
      refundAmount,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/bookings/:id/modify
const modifyBooking = async (req, res, next) => {
  try {
    const { passengers } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) {
      return res
        .status(404)
        .json({ error: { message: "Booking not found." } });
    }

    if (booking.status === "CANCELLED") {
      return res
        .status(400)
        .json({ error: { message: "Cannot modify a cancelled booking." } });
    }

    // Ownership check
    if (req.user.role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.id },
      });
      if (booking.customerId !== customer.id) {
        return res
          .status(403)
          .json({ error: { message: "Access denied." } });
      }
    }

    // Update passengers if provided
    if (passengers) {
      await prisma.$transaction(async (tx) => {
        await tx.passenger.deleteMany({ where: { bookingId: booking.id } });
        await tx.passenger.createMany({
          data: passengers.map((p) => ({
            bookingId: booking.id,
            firstName: p.firstName,
            middleName: p.middleName || null,
            lastName: p.lastName,
            dateOfBirth: new Date(p.dateOfBirth),
            passportNumber: p.passportNumber || null,
            nationality: p.nationality || null,
            passportExpiry: p.passportExpiry
              ? new Date(p.passportExpiry)
              : null,
            seatPreference: p.seatPreference || null,
            specialRequests: p.specialRequests || [],
          })),
        });

        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "MODIFIED" },
        });
      });
    }

    const updated = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        items: { include: { flight: true, hotel: true, package: true } },
        passengers: true,
        invoice: true,
      },
    });

    res.json({ message: "Booking modified.", booking: updated });
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings/admin/all (Admin/Agent — all bookings)
const getAllBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          customer: { include: { user: { select: { email: true } } } },
          items: { include: { flight: true, hotel: true, package: true } },
          invoice: true,
        },
        orderBy: { bookingDate: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      bookings,
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

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  modifyBooking,
  getAllBookings,
};
