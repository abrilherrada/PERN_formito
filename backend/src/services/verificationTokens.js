import { VerificationTokenType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import {
  createTokenRepository,
  findTokenBySelectorRepository,
  markTokenAsUsedRepository,
  deleteTokenRepository,
  deleteTokensByUserIdRepository,
  deleteTokensByUserEmailIdRepository,
  deleteExpiredTokensRepository,
} from '../repositories/verificationToken.js';
import {
  BadRequestError,
  NotFoundError,
} from '../utils/errors/httpErrors.js';
import { handlePrismaError } from '../utils/errors/prismaErrors.js';

const TOKEN_TTL_MINUTES =
  parseInt(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES ?? '60', 10);

const TOKEN_SALT_ROUNDS =
  parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10);


const computeExpiryDate = (ttlMinutes) =>
  new Date(Date.now() + ttlMinutes * 60 * 1000);

const generateTokenPair = async () => {
  const selector = crypto.randomUUID();
  const token = crypto.randomUUID();
  const tokenHash = await bcrypt.hash(token, TOKEN_SALT_ROUNDS);
  return { selector, token, tokenHash };
};

const validateTokenInput = ({ type, userId, userEmailId }) => {
  if (!type) {
    throw new BadRequestError('Verification token type is required', {
      code: 'VERIFICATION_TOKEN_TYPE_REQUIRED',
    });
  }

  if (type === VerificationTokenType.ACCOUNT_EMAIL && !userId) {
    throw new BadRequestError('User id is required for register tokens', {
      code: 'USER_ID_REQUIRED',
    });
  }

  if (type === VerificationTokenType.SECONDARY_EMAIL && !userEmailId) {
    throw new BadRequestError('User email id is required for this token type', {
      code: 'USER_EMAIL_ID_REQUIRED',
    });
  }

  if (type === VerificationTokenType.PASSWORD_RESET && !userId) {
    throw new BadRequestError('User id is required for password reset tokens', {
      code: 'USER_ID_REQUIRED',
    });
  }
};

export const createTokenService = async ({
  userId,
  userEmailId,
  type,
  ttlMinutes = TOKEN_TTL_MINUTES
}) => {
  try {
    validateTokenInput({ type, userId, userEmailId });

    const expiresAt = computeExpiryDate(ttlMinutes);
    const { selector, token, tokenHash } = await generateTokenPair();

    if (type === VerificationTokenType.ACCOUNT_EMAIL) {
      await deleteTokensByUserIdRepository(userId, type);
    }

    if (type === VerificationTokenType.SECONDARY_EMAIL && userEmailId) {
      await deleteTokensByUserEmailIdRepository(userEmailId, type);
    }

    if (type === VerificationTokenType.PASSWORD_RESET) {
      await deleteTokensByUserIdRepository(userId, type);
    }

    const verificationToken = await createTokenRepository({
      userId: type === VerificationTokenType.SECONDARY_EMAIL ? null : userId,
      userEmailId: type === VerificationTokenType.SECONDARY_EMAIL ? userEmailId : null,
      expiresAt,
      tokenSelector: selector,
      tokenHash,
      type,
    });

    return {
      id: verificationToken.id,
      selector,
      token,
      type: verificationToken.type,
      expiresAt: verificationToken.expiresAt,
    };
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const findTokenBySelectorService = async (selector) => {
  const token = await findTokenBySelectorRepository(selector);

  if (!token) {
    throw new NotFoundError('Token not found', { code: 'VERIFICATION_TOKEN_NOT_FOUND' });
  }

  return token;
};

export const consumeTokenService = async (selector, token, expectedType) => {
  const storedToken = await findTokenBySelectorRepository(selector);

  if (!storedToken) {
    throw new NotFoundError('Token not found', { code: 'VERIFICATION_TOKEN_NOT_FOUND' });
  }

  if (storedToken.usedAt) {
    throw new BadRequestError('Token already used', { code: 'VERIFICATION_TOKEN_ALREADY_USED' });
  }

  if (storedToken.expiresAt <= new Date()) {
    throw new BadRequestError('Token expired', { code: 'VERIFICATION_TOKEN_EXPIRED' });
  }

  if (expectedType && storedToken.type !== expectedType) {
    throw new BadRequestError('Token type mismatch', { code: 'VERIFICATION_TOKEN_TYPE_MISMATCH' });
  }

  if (storedToken.type === VerificationTokenType.ACCOUNT_EMAIL && !storedToken.userId) {
    throw new BadRequestError('User id is required', { code: 'USER_ID_REQUIRED' });
  }

  if (storedToken.type === VerificationTokenType.SECONDARY_EMAIL && !storedToken.userEmailId) {
    throw new BadRequestError('User email id is required', { code: 'USER_EMAIL_ID_REQUIRED' });
  }

  if (storedToken.type === VerificationTokenType.PASSWORD_RESET && !storedToken.userId) {
    throw new BadRequestError('User id is required', { code: 'USER_ID_REQUIRED' });
  }

  const isMatch = await bcrypt.compare(token, storedToken.tokenHash);

  if (!isMatch) {
    throw new BadRequestError('Invalid token', { code: 'VERIFICATION_TOKEN_INVALID' });
  }

  await markTokenAsUsedRepository(storedToken.id);

  return storedToken;
};

export const deleteTokenService = async (id) => {
  try {
    await deleteTokenRepository(id);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const deleteTokensByUserIdService = async (userId, type) => {
  try {
    await deleteTokensByUserIdRepository(userId, type);
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
