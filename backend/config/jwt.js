require('dotenv').config();

/**
 * JWT configuration — single source of truth for token signing/verification.
 *
 * JWT_SECRET is REQUIRED. There is deliberately no fallback secret: a
 * hardcoded fallback would let anyone forge a valid token if the env var is
 * ever misconfigured. The server fails fast at startup instead (see server.js).
 *
 * Generate one with: openssl rand -hex 32
 */

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET is required and must be at least 32 characters. ' +
      'Set it in backend/.env or the deployment environment. Generate with: openssl rand -hex 32'
  );
}

const parseDurationToMs = (value, fallbackMs) => {
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)?$/.exec(String(value).trim());
  if (!match) return fallbackMs;
  const amount = parseFloat(match[1]);
  const unit = match[2] || 'ms';
  const multipliers = { ms: 1, s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000, w: 7 * 24 * 60 * 60 * 1000 };
  return Math.round(amount * multipliers[unit]);
};

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';

const TOKEN_ISSUER = 'metmma-api';
const TOKEN_AUDIENCE = 'metmma-frontend';

module.exports = {
  JWT_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  ACCESS_TOKEN_TTL_MS: parseDurationToMs(ACCESS_TOKEN_TTL, 15 * 60 * 1000),
  REFRESH_TOKEN_TTL_MS: parseDurationToMs(REFRESH_TOKEN_TTL, 7 * 24 * 60 * 60 * 1000),
  TOKEN_ISSUER,
  TOKEN_AUDIENCE,
};