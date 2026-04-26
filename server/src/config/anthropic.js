const Anthropic = require("@anthropic-ai/sdk");

const rawKey = process.env.ANTHROPIC_API_KEY || "";
const isConfigured =
  rawKey.startsWith("sk-ant-") && !rawKey.includes("your_anthropic_key");

const client = isConfigured ? new Anthropic({ apiKey: rawKey }) : null;

if (!isConfigured) {
  console.warn("[anthropic] ANTHROPIC_API_KEY not set — planner will use fallback mode.");
}

module.exports = { client, isConfigured };
