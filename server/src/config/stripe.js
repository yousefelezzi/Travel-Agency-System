const Stripe = require("stripe");

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY not set — payment endpoints will fail.");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_missing", {
  apiVersion: "2024-06-20",
});

module.exports = stripe;
