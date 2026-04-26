const prisma = require("../config/db");
const stripe = require("../config/stripe");
const {
  sendBookingConfirmation,
  sendProviderBookingNotification,
} = require("../services/notification.service");

// Best-effort confirmation email after a payment succeeds.
async function fireConfirmationEmail(bookingId) {
  try {
    const full = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        items: { include: { flight: true, hotel: true, package: true } },
        passengers: true,
        customer: { include: { user: { select: { email: true } } } },
      },
    });
    if (!full) return;

    // Customer confirmation
    const email = full.customer?.user?.email;
    if (email) {
      await sendBookingConfirmation({ booking: full, customerEmail: email });
    }

    // Provider notifications (TC_057). Group items by provider.
    const providerItemMap = new Map();
    for (const item of full.items) {
      let providerName = null;
      if (item.flight?.airlineName) providerName = item.flight.airlineName;
      else if (item.hotel?.name) providerName = item.hotel.name;
      else if (item.package?.packageName) providerName = item.package.packageName;
      if (!providerName) continue;
      if (!providerItemMap.has(providerName)) providerItemMap.set(providerName, []);
      providerItemMap.get(providerName).push(item);
    }
    if (providerItemMap.size > 0) {
      const providers = await prisma.provider.findMany({
        where: { name: { in: [...providerItemMap.keys()] }, isActive: true },
      });
      for (const provider of providers) {
        sendProviderBookingNotification({
          booking: full,
          providerEmail: provider.contactEmail,
          providerName: provider.name,
          items: providerItemMap.get(provider.name) || [],
        }).catch((err) =>
          console.error(`[notifications] provider notify (${provider.name}) failed:`, err.message)
        );
      }
    }
  } catch (err) {
    console.error("[notifications] confirmation email failed:", err.message);
  }
}

// Ensure the booking belongs to the authenticated customer and is payable.
const loadPayableBooking = async (bookingId, userId) => {
  const customer = await prisma.customer.findUnique({ where: { userId } });
  if (!customer) return { error: { status: 400, message: "Customer profile not found." } };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true, invoice: true },
  });
  if (!booking) return { error: { status: 404, message: "Booking not found." } };
  if (booking.customerId !== customer.id) {
    return { error: { status: 403, message: "Access denied." } };
  }
  if (booking.status === "CANCELLED") {
    return { error: { status: 400, message: "Booking is cancelled." } };
  }
  if (booking.status === "CONFIRMED") {
    return { error: { status: 400, message: "Booking is already paid." } };
  }
  return { customer, booking };
};

// POST /api/payments/create-intent  { bookingId }
const createPaymentIntent = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ error: { message: "bookingId is required." } });
    }

    const result = await loadPayableBooking(bookingId, req.user.id);
    if (result.error) {
      return res.status(result.error.status).json({ error: { message: result.error.message } });
    }
    const { customer, booking } = result;

    const amountCents = Math.round(Number(booking.totalAmount) * 100);

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        bookingId: booking.id,
        customerId: customer.id,
        userEmail: req.user.email,
      },
    });

    res.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: amountCents,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/confirm  { bookingId, paymentIntentId }
// Server-side verification of PaymentIntent status after client-side confirm.
const confirmPayment = async (req, res, next) => {
  try {
    const { bookingId, paymentIntentId } = req.body;
    if (!bookingId || !paymentIntentId) {
      return res.status(400).json({
        error: { message: "bookingId and paymentIntentId are required." },
      });
    }

    const result = await loadPayableBooking(bookingId, req.user.id);
    if (result.error) {
      return res.status(result.error.status).json({ error: { message: result.error.message } });
    }
    const { booking } = result;

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.metadata?.bookingId !== booking.id) {
      return res.status(400).json({ error: { message: "PaymentIntent does not match booking." } });
    }
    if (intent.status !== "succeeded") {
      return res.status(402).json({
        error: { message: `Payment not completed (status: ${intent.status}).` },
      });
    }

    const charge = intent.latest_charge
      ? await stripe.charges.retrieve(intent.latest_charge)
      : null;
    const billing = charge?.billing_details || {};
    const addr = billing.address || {};
    const [firstName, ...rest] = (billing.name || "").split(" ");
    const lastName = rest.join(" ") || null;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED" },
      });

      await tx.payment.create({
        data: {
          bookingId: booking.id,
          paymentMethod: "STRIPE",
          amount: intent.amount_received / 100,
          transactionRef: charge?.id || intent.id,
          stripePaymentId: intent.id,
          senderFirstName: firstName || null,
          senderLastName: lastName,
          billingStreet: addr.line1 || null,
          billingCity: addr.city || null,
          billingCountry: addr.country || null,
          billingPostal: addr.postal_code || null,
        },
      });

      // Idempotent invoice: only create if missing.
      const existingInvoice = await tx.invoice.findUnique({
        where: { bookingId: booking.id },
      });
      if (!existingInvoice) {
        const invoiceNumber = `INV-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 7)
          .toUpperCase()}`;
        await tx.invoice.create({
          data: {
            bookingId: booking.id,
            invoiceNumber,
            totalAmount: booking.totalAmount,
          },
        });
      }

      return tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          items: { include: { flight: true, hotel: true, package: true } },
          passengers: true,
          payments: true,
          invoice: true,
        },
      });
    });

    fireConfirmationEmail(booking.id);
    res.json({ message: "Payment confirmed.", booking: updated });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/mock-confirm  { bookingId }
// Demo-mode payment: bypasses Stripe, marks booking as paid with a mock Payment record.
// For academic/local testing only.
const mockConfirm = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ error: { message: "bookingId is required." } });
    }

    const result = await loadPayableBooking(bookingId, req.user.id);
    if (result.error) {
      return res.status(result.error.status).json({ error: { message: result.error.message } });
    }
    const { booking } = result;

    const mockRef = `MOCK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED" },
      });

      await tx.payment.create({
        data: {
          bookingId: booking.id,
          paymentMethod: "STRIPE",
          amount: booking.totalAmount,
          transactionRef: mockRef,
          stripePaymentId: mockRef,
        },
      });

      const existingInvoice = await tx.invoice.findUnique({
        where: { bookingId: booking.id },
      });
      if (!existingInvoice) {
        const invoiceNumber = `INV-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 7)
          .toUpperCase()}`;
        await tx.invoice.create({
          data: {
            bookingId: booking.id,
            invoiceNumber,
            totalAmount: booking.totalAmount,
          },
        });
      }

      return tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          items: { include: { flight: true, hotel: true, package: true } },
          passengers: true,
          payments: true,
          invoice: true,
        },
      });
    });

    fireConfirmationEmail(booking.id);
    res.json({ message: "Payment confirmed (demo mode).", booking: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPaymentIntent, confirmPayment, mockConfirm };
