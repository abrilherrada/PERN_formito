import { EmailVerificationTokenType } from '@prisma/client';
import crypto from 'node:crypto';
import {
  createTokenRepository,
  findTokenByTokenRepository,
  markTokenAsUsedRepository,
  deleteTokenRepository,
  deleteTokensByUserIdRepository,
  deleteTokensByUserEmailIdRepository,
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

export const createTokenService = async ({ userId, userEmailId, type }) => {
  try {
    if (!type) {
      throw new BadRequestError('Email verification type is required', { code: 'EMAIL_VERIFICATION_TYPE_REQUIRED' });
    }
    
    if (type === EmailVerificationTokenType.ACCOUNT_EMAIL && !userId) {
      throw new BadRequestError('User id is required for register tokens', { code: 'USER_ID_REQUIRED' });
    }

    if (type === EmailVerificationTokenType.SECONDARY_EMAIL && !userEmailId) {
      throw new BadRequestError('User email id is required for this token type', { code: 'USER_EMAIL_ID_REQUIRED' });
    }

    const expiresAt = computeExpiryDate(TOKEN_TTL_MINUTES);
    const token = crypto.randomUUID();

    let normalizedUserId = null;
    let normalizedUserEmailId = null;

    if (type === EmailVerificationTokenType.ACCOUNT_EMAIL) {
      normalizedUserId = userId;
      await deleteTokensByUserIdRepository(userId);
    }

    if (type === EmailVerificationTokenType.SECONDARY_EMAIL) {
      normalizedUserEmailId = userEmailId;
      await deleteTokensByUserEmailIdRepository(userEmailId);
    }

    return await createTokenRepository({
      userId: normalizedUserId,
      userEmailId: normalizedUserEmailId,
      expiresAt,
      token,
      type
    });
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

export const consumeTokenService = async (tokenString, expectedType) => {
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

  if (expectedType && token.type !== expectedType) {
    throw new BadRequestError('Token type mismatch', { code: 'EMAIL_TOKEN_TYPE_MISMATCH' });
  }

  if (token.type === EmailVerificationTokenType.ACCOUNT_EMAIL && !token.userId) {
    throw new BadRequestError('User id is required', { code: 'USER_ID_REQUIRED' });
  }

  if (token.type === EmailVerificationTokenType.SECONDARY_EMAIL && !token.userEmailId) {
    throw new BadRequestError('User email id is required', { code: 'USER_EMAIL_ID_REQUIRED' });
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
