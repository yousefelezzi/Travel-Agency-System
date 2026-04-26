const bcrypt = require("bcrypt");
const prisma = require("../config/db");
const { refreshPolicyCache } = require("../services/cancellation.service");

// ─── User & role management ───────────────────────────────────────────

// GET /api/admin/users?role=&q=&page=&limit=
const listUsers = async (req, res, next) => {
  try {
    const { role, q, page = 1, limit = 30 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (q) {
      where.OR = [
        { email: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              city: true,
            },
          },
          employee: {
            select: { firstName: true, lastName: true, isFullTime: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/users  { email, username, password, role, firstName, lastName, isFullTime? }
const createStaff = async (req, res, next) => {
  try {
    const {
      email,
      username,
      password,
      role,
      firstName,
      lastName,
      isFullTime = true,
    } = req.body || {};

    if (!email || !username || !password || !role || !firstName || !lastName) {
      return res.status(400).json({
        error: { message: "email, username, password, role, firstName, lastName are required." },
      });
    }
    if (role !== "TRAVEL_AGENT" && role !== "ADMIN") {
      return res
        .status(400)
        .json({ error: { message: "role must be TRAVEL_AGENT or ADMIN." } });
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: { message: "Email or username already in use." } });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role,
        employee: {
          create: {
            firstName,
            lastName,
            isFullTime: !!isFullTime,
          },
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        employee: { select: { firstName: true, lastName: true } },
      },
    });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/users/:id  { role?, isActive? }
const updateUser = async (req, res, next) => {
  try {
    const { role, isActive } = req.body || {};
    const data = {};
    if (typeof role === "string") {
      if (!["CUSTOMER", "TRAVEL_AGENT", "ADMIN"].includes(role)) {
        return res
          .status(400)
          .json({ error: { message: "Invalid role." } });
      }
      data.role = role;
    }
    if (typeof isActive === "boolean") data.isActive = isActive;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
      },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// ─── Sales / performance reports ──────────────────────────────────────

// GET /api/admin/reports/summary?from=&to=
const reportsSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.bookingDate = {};
      if (from) where.bookingDate.gte = new Date(from);
      if (to) where.bookingDate.lte = new Date(to);
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        items: { include: { flight: true, hotel: true, package: true } },
      },
    });

    let totalRevenue = 0;
    let confirmedCount = 0;
    let cancelledCount = 0;
    let pendingCount = 0;

    const revenueByDestination = {};
    const bookingsByCategory = { flight: 0, hotel: 0, package: 0 };
    const monthlyRevenue = {};

    for (const b of bookings) {
      const net = Number(b.totalAmount) - Number(b.discount || 0);
      if (b.status === "CONFIRMED" || b.status === "MODIFIED") {
        totalRevenue += net;
        confirmedCount += 1;
      } else if (b.status === "CANCELLED") {
        cancelledCount += 1;
      } else {
        pendingCount += 1;
      }

      // Monthly bucket
      const monthKey = b.bookingDate.toISOString().slice(0, 7);
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (b.status === "CONFIRMED" || b.status === "MODIFIED" ? net : 0);

      for (const item of b.items || []) {
        if (item.flight) {
          bookingsByCategory.flight += 1;
          const dest = item.flight.arrivalPort || "Unknown";
          revenueByDestination[dest] = (revenueByDestination[dest] || 0) + Number(item.unitPrice) * (item.quantity || 1);
        } else if (item.hotel) {
          bookingsByCategory.hotel += 1;
          const dest = item.hotel.city || "Unknown";
          revenueByDestination[dest] = (revenueByDestination[dest] || 0) + Number(item.unitPrice) * (item.quantity || 1);
        } else if (item.package) {
          bookingsByCategory.package += 1;
          const dest = item.package.packageName || "Package";
          revenueByDestination[dest] = (revenueByDestination[dest] || 0) + Number(item.unitPrice) * (item.quantity || 1);
        }
      }
    }

    const topDestinations = Object.entries(revenueByDestination)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([destination, revenue]) => ({
        destination,
        revenue: Math.round(revenue * 100) / 100,
      }));

    const monthly = Object.entries(monthlyRevenue)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, revenue]) => ({
        month,
        revenue: Math.round(revenue * 100) / 100,
      }));

    const userCounts = await prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    });

    const usersByRole = userCounts.reduce((acc, u) => {
      acc[u.role] = u._count._all;
      return acc;
    }, {});

    res.json({
      totals: {
        bookingsCount: bookings.length,
        confirmedCount,
        cancelledCount,
        pendingCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
      },
      bookingsByCategory,
      topDestinations,
      monthlyRevenue: monthly,
      usersByRole,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Customer search (used by staff for book-on-behalf) ───────────────

// GET /api/admin/customers?q=&limit=
const searchCustomers = async (req, res, next) => {
  try {
    const { q = "", limit = 20 } = req.query;
    const where = q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {};

    const customers = await prisma.customer.findMany({
      where,
      take: parseInt(limit),
      include: { user: { select: { email: true } } },
      orderBy: { firstName: "asc" },
    });
    res.json({ customers });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/customers/:id/bookings
// Returns the full booking history for a specific customer so agents can
// drill in from the Customers tab.
const getCustomerBookings = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { email: true, isActive: true, role: true } } },
    });
    if (!customer) {
      return res
        .status(404)
        .json({ error: { message: "Customer not found." } });
    }
    const bookings = await prisma.booking.findMany({
      where: { customerId: customer.id },
      include: {
        items: { include: { flight: true, hotel: true, package: true } },
        invoice: true,
        payments: true,
      },
      orderBy: { bookingDate: "desc" },
    });
    res.json({ customer, bookings });
  } catch (err) {
    next(err);
  }
};

// ─── System configuration (cancellation policy, etc.) ────────────────

const DEFAULT_POLICY = {
  earlyTierDays: 7,
  earlyFeePercent: 10,
  lateFeePercent: 30,
  pendingFeePercent: 0,
};

const POLICY_KEY = "cancellation_policy";

// GET /api/admin/config/cancellation-policy
const getCancellationPolicy = async (req, res, next) => {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: POLICY_KEY } });
    res.json({ policy: row?.value || DEFAULT_POLICY });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/config/cancellation-policy  { earlyTierDays, earlyFeePercent, lateFeePercent, pendingFeePercent }
const updateCancellationPolicy = async (req, res, next) => {
  try {
    const policy = {
      earlyTierDays: Number(req.body.earlyTierDays ?? DEFAULT_POLICY.earlyTierDays),
      earlyFeePercent: Number(req.body.earlyFeePercent ?? DEFAULT_POLICY.earlyFeePercent),
      lateFeePercent: Number(req.body.lateFeePercent ?? DEFAULT_POLICY.lateFeePercent),
      pendingFeePercent: Number(req.body.pendingFeePercent ?? DEFAULT_POLICY.pendingFeePercent),
    };
    if (
      [policy.earlyTierDays, policy.earlyFeePercent, policy.lateFeePercent, policy.pendingFeePercent].some(
        (n) => Number.isNaN(n) || n < 0
      )
    ) {
      return res
        .status(400)
        .json({ error: { message: "All policy values must be non-negative numbers." } });
    }
    if (policy.earlyFeePercent > 100 || policy.lateFeePercent > 100 || policy.pendingFeePercent > 100) {
      return res
        .status(400)
        .json({ error: { message: "Fee percentages must be 0–100." } });
    }

    await prisma.systemConfig.upsert({
      where: { key: POLICY_KEY },
      update: { value: policy },
      create: { key: POLICY_KEY, value: policy },
    });
    // Force the in-memory cache to refetch on next quote
    refreshPolicyCache().catch(() => {});
    res.json({ policy });
  } catch (err) {
    next(err);
  }
};

// ─── Job listings (careers portal) ────────────────────────────────────

// GET /api/admin/jobs (admin) and GET /api/jobs (public published)
const listAllJobs = async (req, res, next) => {
  try {
    const jobs = await prisma.jobListing.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { applications: true } },
      },
    });
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
};

const listPublishedJobs = async (req, res, next) => {
  try {
    const jobs = await prisma.jobListing.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
};

const createJob = async (req, res, next) => {
  try {
    const {
      title,
      department,
      description,
      qualifications,
      workHours,
      compensation,
      isPublished = false,
    } = req.body || {};
    if (!title || !department || !description) {
      return res.status(400).json({
        error: { message: "title, department, and description are required." },
      });
    }
    const job = await prisma.jobListing.create({
      data: {
        title,
        department,
        description,
        qualifications: qualifications || "",
        workHours: workHours || null,
        compensation: compensation || null,
        isPublished: !!isPublished,
      },
    });
    res.status(201).json({ job });
  } catch (err) {
    next(err);
  }
};

const updateJob = async (req, res, next) => {
  try {
    const data = {};
    [
      "title",
      "department",
      "description",
      "qualifications",
      "workHours",
      "compensation",
      "isPublished",
    ].forEach((key) => {
      if (key in req.body) data[key] = req.body[key];
    });
    const job = await prisma.jobListing.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ job });
  } catch (err) {
    next(err);
  }
};

const deleteJob = async (req, res, next) => {
  try {
    await prisma.jobListing.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted." });
  } catch (err) {
    next(err);
  }
};

const listApplications = async (req, res, next) => {
  try {
    const { jobId } = req.query;
    const where = jobId ? { listingId: jobId } : {};
    const applications = await prisma.jobApplication.findMany({
      where,
      include: { listing: { select: { title: true, department: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ applications });
  } catch (err) {
    next(err);
  }
};

// POST /api/jobs/:id/apply (public)
const applyToJob = async (req, res, next) => {
  try {
    const { applicantName, email, phone, resumeUrl, coverLetter } = req.body || {};
    if (!applicantName || !email) {
      return res
        .status(400)
        .json({ error: { message: "applicantName and email are required." } });
    }
    const job = await prisma.jobListing.findUnique({
      where: { id: req.params.id },
    });
    if (!job || !job.isPublished) {
      return res
        .status(404)
        .json({ error: { message: "Job listing not found." } });
    }
    const application = await prisma.jobApplication.create({
      data: {
        listingId: job.id,
        applicantName,
        email,
        phone: phone || null,
        resumeUrl: resumeUrl || null,
        coverLetter: coverLetter || null,
      },
    });
    res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
};

// ─── Third-party API credentials (provider keys) ──────────────────────

const apiCredentialKey = (name) => `provider_creds_${name.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;

const listApiCredentials = async (req, res, next) => {
  try {
    const rows = await prisma.systemConfig.findMany({
      where: { key: { startsWith: "provider_creds_" } },
    });
    // Mask the key to last 4 chars on read
    const credentials = rows.map((r) => {
      const v = r.value || {};
      return {
        id: r.id,
        provider: v.provider,
        // Show only the last 4 chars
        apiKeyMasked: v.apiKey ? `••••${String(v.apiKey).slice(-4)}` : "—",
        notes: v.notes || "",
        updatedAt: r.updatedAt,
      };
    });
    res.json({ credentials });
  } catch (err) {
    next(err);
  }
};

const upsertApiCredential = async (req, res, next) => {
  try {
    const { provider, apiKey, notes } = req.body || {};
    if (!provider || !apiKey) {
      return res
        .status(400)
        .json({ error: { message: "provider and apiKey are required." } });
    }
    const key = apiCredentialKey(provider);
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: { provider, apiKey, notes: notes || "" } },
      create: { key, value: { provider, apiKey, notes: notes || "" } },
    });
    res.json({ message: "Credential saved." });
  } catch (err) {
    next(err);
  }
};

const deleteApiCredential = async (req, res, next) => {
  try {
    const provider = req.params.provider;
    const key = apiCredentialKey(provider);
    await prisma.systemConfig.delete({ where: { key } }).catch(() => {});
    res.json({ message: "Credential removed." });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  createStaff,
  updateUser,
  reportsSummary,
  searchCustomers,
  getCustomerBookings,
  getCancellationPolicy,
  updateCancellationPolicy,
  listAllJobs,
  listPublishedJobs,
  createJob,
  updateJob,
  deleteJob,
  listApplications,
  applyToJob,
  listApiCredentials,
  upsertApiCredential,
  deleteApiCredential,
};
