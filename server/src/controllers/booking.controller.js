const prisma = require("../config/db");
const { quoteCancellation } = require("../services/cancellation.service");
const { streamInvoicePdf } = require("../services/invoice.service");
const {
  sendBookingConfirmation,
  sendBookingModification,
  sendBookingCancellation,
} = require("../services/notification.service");

// Helper: load a booking with everything we need (items + customer email)
async function loadFullBooking(id) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      items: { include: { flight: true, hotel: true, package: true } },
      passengers: true,
      payments: true,
      invoice: true,
      customer: { include: { user: { select: { email: true } } } },
    },
  });
}

// Helper: enforce ownership for customer requests
async function ensureOwnership(req, booking) {
  if (req.user.role !== "CUSTOMER") return null;
  const customer = await prisma.customer.findUnique({
    where: { userId: req.user.id },
  });
  if (!customer || booking.customerId !== customer.id) {
    return { code: 403, message: "Access denied." };
  }
  return null;
}

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

// GET /api/bookings/:id/cancellation-quote
// Preview the fee + refund the customer would get if they cancelled now.
const getCancellationQuote = async (req, res, next) => {
  try {
    const booking = await loadFullBooking(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ error: { message: "Booking not found." } });
    }
    const blocked = await ensureOwnership(req, booking);
    if (blocked) return res.status(blocked.code).json({ error: { message: blocked.message } });

    if (booking.status === "CANCELLED") {
      return res.status(400).json({
        error: { message: "Booking is already cancelled." },
      });
    }

    const quote = quoteCancellation(booking);
    res.json({ quote });
  } catch (error) {
    next(error);
  }
};

// POST /api/bookings/:id/cancel
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await loadFullBooking(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ error: { message: "Booking not found." } });
    }
    const blocked = await ensureOwnership(req, booking);
    if (blocked) return res.status(blocked.code).json({ error: { message: blocked.message } });

    if (booking.status === "CANCELLED") {
      return res
        .status(400)
        .json({ error: { message: "Booking is already cancelled." } });
    }

    const quote = quoteCancellation(booking);

    // Cancel + restore availability + record cancellation fee as a discount-style adjustment
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

    // Refund stub: when Stripe is configured + a payment exists, attempt
    // a real refund. Otherwise just acknowledge.
    let refund = { mode: "demo", amount: quote.refundAmount };
    if (booking.payments?.length && process.env.STRIPE_SECRET_KEY?.startsWith("sk_")) {
      try {
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        const lastPayment = booking.payments[booking.payments.length - 1];
        if (lastPayment?.transactionNumber) {
          await stripe.refunds.create({
            payment_intent: lastPayment.transactionNumber,
            amount: Math.round(quote.refundAmount * 100),
          });
          refund = { mode: "stripe", amount: quote.refundAmount };
        }
      } catch (err) {
        console.error("[cancel] Stripe refund failed:", err.message);
        refund = { mode: "demo", amount: quote.refundAmount, error: err.message };
      }
    }

    // Fire the cancellation email (best-effort)
    const customerEmail = booking.customer?.user?.email;
    if (customerEmail) {
      sendBookingCancellation({
        booking,
        customerEmail,
        cancellationFee: quote.feeAmount,
        refundAmount: quote.refundAmount,
      }).catch((err) =>
        console.error("[notifications] cancellation email failed:", err.message)
      );
    }

    res.json({
      message: "Booking cancelled.",
      cancellationFee: quote.feeAmount,
      refundAmount: quote.refundAmount,
      feePercent: quote.feePercent,
      tier: quote.tier,
      reason: quote.reason,
      refund,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/bookings/:id/modify
// Body: { passengers?, items?: [{ id, checkIn?, checkOut?, seatClass? }] }
// "items" supports updating per-item dates (hotels) or seat class (flights);
// totals are recomputed from current inventory pricing on changed items.
const modifyBooking = async (req, res, next) => {
  try {
    const { passengers, items: itemUpdates } = req.body;

    const booking = await loadFullBooking(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ error: { message: "Booking not found." } });
    }
    const blocked = await ensureOwnership(req, booking);
    if (blocked) return res.status(blocked.code).json({ error: { message: blocked.message } });

    if (booking.status === "CANCELLED") {
      return res
        .status(400)
        .json({ error: { message: "Cannot modify a cancelled booking." } });
    }

    const changes = [];

    await prisma.$transaction(async (tx) => {
      // ── ITEM-LEVEL UPDATES (dates / seat class) ──
      if (Array.isArray(itemUpdates) && itemUpdates.length > 0) {
        for (const upd of itemUpdates) {
          const item = booking.items.find((i) => i.id === upd.id);
          if (!item) continue;

          // Hotel: date change → recompute price by nightly rate
          if (item.hotelId && (upd.checkIn || upd.checkOut)) {
            const checkIn = upd.checkIn ? new Date(upd.checkIn) : item.checkIn;
            const checkOut = upd.checkOut ? new Date(upd.checkOut) : item.checkOut;
            const nights = Math.max(
              1,
              Math.ceil((checkOut - checkIn) / 86400000)
            );
            const unitPrice = Number(item.hotel.pricePerNight) * nights;
            await tx.bookingItem.update({
              where: { id: item.id },
              data: { checkIn, checkOut, unitPrice },
            });
            changes.push(
              `Hotel "${item.hotel.name}" rescheduled to ${checkIn
                .toISOString()
                .slice(0, 10)} → ${checkOut.toISOString().slice(0, 10)} (${nights} night${nights === 1 ? "" : "s"})`
            );
          }

          // Flight: seat class change → reprice per cabin
          if (item.flightId && upd.seatClass && upd.seatClass !== item.seatClass) {
            const newPrice =
              upd.seatClass === "business" && item.flight.businessPrice
                ? Number(item.flight.businessPrice)
                : Number(item.flight.economyPrice);
            await tx.bookingItem.update({
              where: { id: item.id },
              data: { seatClass: upd.seatClass, unitPrice: newPrice },
            });
            changes.push(
              `Flight ${item.flight.flightNumber} cabin changed to ${upd.seatClass}`
            );
          }
        }

        // Recompute total
        const refreshed = await tx.bookingItem.findMany({
          where: { bookingId: booking.id },
        });
        const newTotal = refreshed.reduce(
          (sum, i) => sum + Number(i.unitPrice) * (i.quantity || 1),
          0
        );
        await tx.booking.update({
          where: { id: booking.id },
          data: { totalAmount: newTotal, status: "MODIFIED" },
        });
      }

      // ── PASSENGER REPLACEMENT ──
      if (Array.isArray(passengers) && passengers.length > 0) {
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
        changes.push(`Passenger list updated (${passengers.length} traveler${passengers.length === 1 ? "" : "s"})`);
      }
    });

    const updated = await loadFullBooking(booking.id);

    // Best-effort email
    const customerEmail = updated.customer?.user?.email;
    if (customerEmail && changes.length > 0) {
      sendBookingModification({
        booking: updated,
        customerEmail,
        changes,
      }).catch((err) =>
        console.error("[notifications] modification email failed:", err.message)
      );
    }

    res.json({ message: "Booking modified.", booking: updated, changes });
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

// GET /api/bookings/:id/invoice.pdf
// Streams a styled PDF invoice for a confirmed booking. Customers can
// only download their own; agents/admins can download any.
const downloadInvoicePdf = async (req, res, next) => {
  try {
    const booking = await loadFullBooking(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ error: { message: "Booking not found." } });
    }
    const blocked = await ensureOwnership(req, booking);
    if (blocked) return res.status(blocked.code).json({ error: { message: blocked.message } });

    if (!booking.invoice) {
      return res.status(400).json({
        error: {
          message: "No invoice available — payment must be completed first.",
        },
      });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: booking.customerId },
      include: { user: { select: { email: true } } },
    });
    const customerProfile = {
      firstName: customer?.firstName,
      lastName: customer?.lastName,
      email: customer?.user?.email,
      phone: customer?.phone,
      street: customer?.street,
      city: customer?.city,
      state: customer?.state,
    };

    streamInvoicePdf({ booking, customer: customerProfile, response: res });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  getCancellationQuote,
  cancelBooking,
  modifyBooking,
  getAllBookings,
  downloadInvoicePdf,
};
