import {
  createSessionTokenRepository,
  findSessionTokenByHashRepository,
  updateSessionTokenRepository,
  revokeSessionTokensForUserRepository
} from '../repositories/sessionToken.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors/httpErrors.js';
import { handlePrismaError } from '../utils/errors/prismaErrors.js';
import {
  assertSessionTokenActive,
  computeSessionTokenExpiry,
  generateSessionTokenValue,
  hashSessionTokenValue,
} from '../utils/manageSessionToken.js';

export const createSessionToken = async (userId, options = {}) => {
  if (!userId) {
    throw new BadRequestError('User id is required to create a session token', {
      code: 'SESSION_USER_ID_REQUIRED',
    });
  }

  const { userAgent = null, ipAddress = null, rotatedFromId } = options;
  
  try {
    const token = generateSessionTokenValue();
    const tokenHash = hashSessionTokenValue(token);
    const expiresAt = computeSessionTokenExpiry();
    const sessionToken = await createSessionTokenRepository({
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
      rotatedFromId,
    });

    return { token, sessionToken };
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const rotateSessionToken = async (refreshToken, options = {}) => {
  if (!refreshToken) {
    throw new BadRequestError('Refresh token is required', {
      code: 'SESSION_TOKEN_REQUIRED',
    });
  }

  try {
    const tokenHash = hashSessionTokenValue(refreshToken);
    const existingToken = await findSessionTokenByHashRepository(tokenHash, {
      includeRelations: true,
    });

    assertSessionTokenActive(existingToken);

    const { sessionToken: newSessionToken, token: newToken } = await createSessionToken(
      existingToken.userId,
      {
        ...options,
        rotatedFromId: existingToken.id,
      }
    );

    await updateSessionTokenRepository(existingToken.id, {
      revokedAt: new Date(),
      revokedReason: 'ROTATED',
      replacedByToken: {
        connect: { id: newSessionToken.id },
      },
    });

    return { token: newToken, sessionToken: newSessionToken, previousToken: existingToken };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
      throw error;
    }

    throw handlePrismaError(error);
  }
};

export const revokeSessionToken = async (sessionTokenId, { reason, revokedAt = new Date() } = {}) => {
  if (!sessionTokenId) {
    throw new BadRequestError('Session token id is required', {
      code: 'SESSION_TOKEN_ID_REQUIRED',
    });
  }

  try {
    return await updateSessionTokenRepository(sessionTokenId, {
      revokedAt,
      ...(reason ? { revokedReason: reason } : {}),
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const revokeSessionByRefreshToken = async (
  refreshToken,
  { reason, revokedAt = new Date() } = {}
) => {
  if (!refreshToken) {
    throw new BadRequestError('Refresh token is required', {
      code: 'SESSION_TOKEN_REQUIRED',
    });
  }

  try {
    const tokenHash = hashSessionTokenValue(refreshToken);
    const existingToken = await findSessionTokenByHashRepository(tokenHash, {
      includeRelations: true,
    });

    assertSessionTokenActive(existingToken);

    await revokeSessionToken(existingToken.id, { reason, revokedAt });

    return existingToken;
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
      throw error;
    }

    throw handlePrismaError(error);
  }
};

export const revokeAllTokensForUser = async (
  userId,
  { excludeIds = [], reason, revokedAt = new Date() } = {}
) => {
  if (!userId) {
    throw new BadRequestError('User id is required to revoke sessions', {
      code: 'SESSION_USER_ID_REQUIRED',
    });
  }

  try {
    return await revokeSessionTokensForUserRepository(userId, {
      excludeIds,
      revokedAt,
      revokedReason: reason,
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
};