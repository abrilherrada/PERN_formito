import crypto from 'node:crypto';
import {
  createTokenRepository,
  findTokenByTokenRepository,
  markTokenAsUsedRepository,
  deleteTokenRepository,
  deleteTokensByUserIdRepository,
  deleteExpiredTokensRepository,
} from '../repositories/emailVerification.js';
import {
  BadRequestError,
  NotFoundError,
} from '../utils/errors/httpErrors.js';
import { handlePrismaError } from '../utils/errors/prismaErrors.js';

const TOKEN_TTL_MINUTES =
  parseInt(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES ?? '60', 10);

const computeExpiryDate = (ttlMinutes) =>
  new Date(Date.now() + ttlMinutes * 60 * 1000);

export const createTokenService = async (userId) => {
  try {
    const expiresAt = computeExpiryDate(TOKEN_TTL_MINUTES);
    const token = crypto.randomUUID();

    await deleteTokensByUserIdRepository(userId);

    return await createTokenRepository(userId, expiresAt, token);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const findTokenByTokenService = async (tokenString) => {
  const token = await findTokenByTokenRepository(tokenString);

  if (!token) {
    throw new NotFoundError('Token not found', { code: 'EMAIL_TOKEN_NOT_FOUND' });
  }

  return token;
};

export const consumeTokenService = async (tokenString) => {
  const token = await findTokenByTokenRepository(tokenString);

  if (!token) {
    throw new NotFoundError('Token not found', { code: 'EMAIL_TOKEN_NOT_FOUND' });
  }

  if (token.usedAt) {
    throw new BadRequestError('Token already used', { code: 'EMAIL_TOKEN_ALREADY_USED' });
  }

  if (token.expiresAt <= new Date()) {
    throw new BadRequestError('Token expired', { code: 'EMAIL_TOKEN_EXPIRED' });
  }

  await markTokenAsUsedRepository(token.id);

  return token;
};

export const deleteTokenService = async (id) => {
  try {
    await deleteTokenRepository(id);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const deleteTokensByUserIdService = async (userId) => {
  try {
    await deleteTokensByUserIdRepository(userId);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const deleteExpiredTokensService = async () => {
  try {
    await deleteExpiredTokensRepository(new Date());
  } catch (error) {
    throw handlePrismaError(error);
  }
};
