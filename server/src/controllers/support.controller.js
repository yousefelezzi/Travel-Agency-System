const prisma = require("../config/db");

// Static FAQ catalog. Future iteration: move to admin-editable DB.
const CATEGORIES = [
  {
    id: "BOOKING_ISSUE",
    label: "Booking issue",
    description: "Problems with a confirmation, dates, or itinerary.",
    faqs: [
      {
        q: "I didn't receive my booking confirmation email.",
        a: "Confirmation emails are sent within a few minutes of payment. Check your spam folder, then verify the email on your account is correct. You can also re-download your invoice from the dashboard.",
      },
      {
        q: "Can I add a passenger after I've booked?",
        a: "Yes — open your booking from the dashboard, click 'Modify booking', and add the passenger. A small modification fee may apply for some fares.",
      },
      {
        q: "My flight time changed. What do I do?",
        a: "Airlines occasionally adjust schedules. We'll notify you by email; if the change doesn't work for you, contact us within 7 days for a free rebooking.",
      },
    ],
  },
  {
    id: "PAYMENT_REFUND",
    label: "Payment or refund",
    description: "Charges, refunds, or payment-method questions.",
    faqs: [
      {
        q: "How long do refunds take?",
        a: "Refunds are processed back to the original payment method and typically appear in 5–10 business days. Bank policies vary.",
      },
      {
        q: "What's the cancellation fee?",
        a: "10% if you cancel more than 7 days before travel; 30% within 7 days. Unpaid (PENDING) bookings cancel free.",
      },
      {
        q: "I was charged twice.",
        a: "Open a ticket below with your booking ID — we'll investigate the duplicate charge immediately and refund within 24 hours.",
      },
    ],
  },
  {
    id: "GENERAL_INFO",
    label: "General travel information",
    description: "Visas, baggage, check-in, destination tips.",
    faqs: [
      {
        q: "When should I check in for my flight?",
        a: "Online check-in usually opens 24 hours before departure. We recommend completing it before arriving at the airport.",
      },
      {
        q: "Do I need a visa?",
        a: "It depends on your nationality and destination. Check the destination country's official immigration page; ATLAS doesn't issue visas but we can recommend trusted services.",
      },
      {
        q: "What's the baggage allowance?",
        a: "Allowances vary by airline and fare class. Check your booking details — the allowance is listed under each flight, or on the airline's website using the flight number.",
      },
    ],
  },
  {
    id: "COMPLAINT",
    label: "Complaint",
    description: "Something didn't go right — we want to make it right.",
    faqs: [
      {
        q: "How do I file a complaint?",
        a: "Open a ticket below with as much detail as possible (booking ID, dates, what happened). A senior agent will respond within 1 business day.",
      },
      {
        q: "How do I escalate an unresolved issue?",
        a: "If a ticket has been open for more than 3 days, reply to the ticket email and our concierge lead will personally take it over.",
      },
    ],
  },
];

// GET /api/support/categories
const getCategories = async (req, res) => {
  res.json({ categories: CATEGORIES });
};

// GET /api/support/categories/:id
const getCategory = async (req, res) => {
  const cat = CATEGORIES.find((c) => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: { message: "Unknown category." } });
  res.json({ category: cat });
};

// POST /api/support/tickets
const createTicket = async (req, res, next) => {
  try {
    const { category, subject, description } = req.body || {};
    if (!category || !subject || !description) {
      return res.status(400).json({
        error: { message: "category, subject, and description are required." },
      });
    }
    if (!CATEGORIES.find((c) => c.id === category)) {
      return res
        .status(400)
        .json({ error: { message: "Unknown category." } });
    }

    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id },
    });
    if (!customer) {
      return res
        .status(400)
        .json({ error: { message: "Customer profile not found." } });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        customerId: customer.id,
        category,
        subject: subject.slice(0, 200),
        description: description.slice(0, 5000),
        status: "OPEN",
      },
    });

    res.status(201).json({ message: "Ticket created.", ticket });
  } catch (error) {
    next(error);
  }
};

// GET /api/support/tickets/my
const getMyTickets = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id },
    });
    if (!customer) {
      return res.json({ tickets: [] });
    }
    const tickets = await prisma.supportTicket.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ tickets });
  } catch (error) {
    next(error);
  }
};

// GET /api/support/tickets/admin (agent + admin)
const getAllTickets = async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        customer: { include: { user: { select: { email: true } } } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    res.json({ tickets });
  } catch (error) {
    next(error);
  }
};

// PUT /api/support/tickets/:id/resolve  (agent + admin)
const resolveTicket = async (req, res, next) => {
  try {
    const { resolution, status = "RESOLVED" } = req.body || {};
    if (!resolution || resolution.trim().length === 0) {
      return res
        .status(400)
        .json({ error: { message: "A resolution note is required." } });
    }
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
    });
    if (!ticket) {
      return res
        .status(404)
        .json({ error: { message: "Ticket not found." } });
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status,
        resolution: resolution.slice(0, 2000),
      },
    });

    res.json({ message: "Ticket updated.", ticket: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategory,
  createTicket,
  getMyTickets,
  getAllTickets,
  resolveTicket,
};
