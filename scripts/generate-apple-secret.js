/**
 * Generate Apple Sign In client secret JWT for Supabase.
 *
 * Usage:
 *   node scripts/generate-apple-secret.js <path-to-.p8-file> <key-id> <team-id> <services-id>
 *
 * Example:
 *   node scripts/generate-apple-secret.js ~/Downloads/AuthKey_XXXXXXXXXX.p8 XXXXXXXXXX 93HBV58WBY com.calton24.caloric.auth
 */

const jwt = require("jsonwebtoken");
const fs = require("fs");

const [p8Path, keyId, teamId, servicesId] = process.argv.slice(2);

if (!p8Path || !keyId || !teamId || !servicesId) {
  console.error(
    "Usage: node scripts/generate-apple-secret.js <p8-file> <key-id> <team-id> <services-id>"
  );
  process.exit(1);
}

const privateKey = fs.readFileSync(p8Path, "utf8");

const now = Math.floor(Date.now() / 1000);
const sixMonths = 15777000; // ~6 months in seconds

const token = jwt.sign({}, privateKey, {
  algorithm: "ES256",
  keyid: keyId,
  issuer: teamId,
  audience: "https://appleid.apple.com",
  subject: servicesId,
  expiresIn: sixMonths,
});

console.log("\n=== Apple Client Secret JWT ===\n");
console.log(token);
console.log("\nCopy the above JWT and paste it into Supabase → Apple → Secret Key (for OAuth)");
console.log(`\nExpires: ${new Date((now + sixMonths) * 1000).toISOString()}\n`);
