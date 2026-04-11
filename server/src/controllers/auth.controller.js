const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const {
      email,
      username,
      password,
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      phone,
      accountType,
      street,
      city,
      state,
    } = req.body;

    // Check duplicate email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({
        error: { message: "An account with this email already exists." },
      });
    }

    // Check duplicate username
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return res.status(409).json({
        error: { message: "This username is already taken." },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user + customer profile in a transaction
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: "CUSTOMER",
        customer: {
          create: {
            firstName,
            middleName: middleName || null,
            lastName,
            dateOfBirth: new Date(dateOfBirth),
            phone: phone || null,
            accountType: accountType || "INDIVIDUAL",
            street: street || null,
            city: city || null,
            state: state || null,
          },
        },
      },
      include: {
        customer: true,
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        customer: {
          id: user.customer.id,
          firstName: user.customer.firstName,
          lastName: user.customer.lastName,
          accountType: user.customer.accountType,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!user) {
      return res
        .status(401)
        .json({ error: { message: "Invalid email or password." } });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: { message: "Account has been deactivated." },
      });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res
        .status(401)
        .json({ error: { message: "Invalid email or password." } });
    }

    const token = generateToken(user.id);

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        profile: user.customer || user.employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        customer: true,
        employee: true,
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
