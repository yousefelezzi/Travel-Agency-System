const { body, validationResult } = require("express-validator");

// Return validation errors as JSON
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: { message: errors.array()[0].msg } });
  }
  next();
};

const registerRules = [
  body("email").isEmail().withMessage("Valid email is required."),
  body("username")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter.")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number.")
    .matches(/[^A-Za-z0-9]/)
    .withMessage("Password must contain at least one special character."),
  body("firstName").notEmpty().withMessage("First name is required."),
  body("lastName").notEmpty().withMessage("Last name is required."),
  // dateOfBirth is only required for customer (traveler) accounts.
  body("dateOfBirth")
    .if((value, { req }) => !req.body.role || req.body.role === "CUSTOMER")
    .isISO8601()
    .withMessage("Valid date of birth is required."),
  handleValidation,
];

const loginRules = [
  body("email").isEmail().withMessage("Valid email is required."),
  body("password").notEmpty().withMessage("Password is required."),
  handleValidation,
];

module.exports = { registerRules, loginRules };
