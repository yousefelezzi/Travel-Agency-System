const prisma = require("../config/db");

// Authenticates external service providers via the X-Provider-Key header.
// Different from the user-facing JWT — providers don't log in, they use a
// long-lived API key issued by an ATLAS admin.
async function authenticateProvider(req, res, next) {
  try {
    const key = req.header("x-provider-key") || req.query.apiKey;
    if (!key) {
      return res
        .status(401)
        .json({ error: { message: "Missing provider API key (X-Provider-Key header)." } });
    }
    const provider = await prisma.provider.findUnique({ where: { apiKey: key } });
    if (!provider || !provider.isActive) {
      return res
        .status(401)
        .json({ error: { message: "Invalid or inactive provider key." } });
    }
    req.provider = provider;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticateProvider };
