import crypto from 'node:crypto';
import { BadRequestError, UnauthorizedError } from './errors/httpErrors.js';

const SESSION_TOKEN_DEFAULT_TTL = '7d';
const SESSION_TOKEN_DURATION_REGEX = /^(\d+)([smhd])$/i;
const SESSION_TOKEN_UNITS_TO_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};
const SESSION_TOKEN_LENGTH_BYTES = 64;

export const parseSessionTokenDuration = (value, fallback = SESSION_TOKEN_DEFAULT_TTL) => {
  const duration = value?.trim() || fallback;
  const match = duration.match(SESSION_TOKEN_DURATION_REGEX);

  if (!match) {
    throw new BadRequestError('Invalid duration format for refresh token TTL', {
      code: 'INVALID_REFRESH_TOKEN_TTL',
    });
  }

  const [, quantity, unitRaw] = match;
  const unit = unitRaw.toLowerCase();

  return Number(quantity) * SESSION_TOKEN_UNITS_TO_MS[unit];
};

export const buildRefreshTokenCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const ttlMs = parseSessionTokenDuration(process.env.JWT_REFRESH_EXPIRES_IN);

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: ttlMs,
  };
};

export const getRefreshTokenCookieName = () =>
  process.env.REFRESH_TOKEN_COOKIE_NAME ?? 'formito_refresh';

export const setRefreshTokenCookie = (res, token) => {
  res.cookie(getRefreshTokenCookieName(), token, buildRefreshTokenCookieOptions());
};

export const clearRefreshTokenCookie = (res) => {
  const options = buildRefreshTokenCookieOptions();
  res.clearCookie(getRefreshTokenCookieName(), { ...options, maxAge: 0 });
};

export const computeSessionTokenExpiry = (envTtl = process.env.JWT_REFRESH_EXPIRES_IN) => {
  const ttlMs = parseSessionTokenDuration(envTtl);
  return new Date(Date.now() + ttlMs);
};

export const generateSessionTokenValue = (lengthBytes = SESSION_TOKEN_LENGTH_BYTES) =>
  crypto.randomBytes(lengthBytes).toString('hex');

export const hashSessionTokenValue = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const assertSessionTokenActive = (sessionToken) => {
  if (!sessionToken) {
    throw new UnauthorizedError('Invalid refresh token', { code: 'SESSION_TOKEN_NOT_FOUND' });
  }

  if (sessionToken.revokedAt) {
    throw new UnauthorizedError('Refresh token has been revoked', { code: 'SESSION_TOKEN_REVOKED' });
  }

  if (sessionToken.expiresAt <= new Date()) {
    throw new UnauthorizedError('Refresh token expired', { code: 'SESSION_TOKEN_EXPIRED' });
  }
};