import {
  createSessionTokenRepository,
  findSessionTokenByHashRepository,
  updateSessionTokenRepository,
  revokeSessionTokensForUserRepository,
  findActiveSessionTokensByUserRepository,
  revokeSessionTokensByIdsRepository,
} from '../repositories/sessionToken.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors/httpErrors.js';
import { handlePrismaError } from '../utils/errors/prismaErrors.js';
import {
  assertSessionTokenActive,
  computeSessionTokenExpiry,
  generateSessionTokenValue,
  hashSessionTokenValue,
} from '../utils/manageSessionToken.js';

const MAX_ACTIVE_SESSION_TOKENS = Number(process.env.MAX_ACTIVE_SESSION_TOKENS ?? 20);

const enforceSessionTokenCap = async (
  userId,
  { excludeIds = [], pendingRevocations = 0 } = {}
) => {
  if (!MAX_ACTIVE_SESSION_TOKENS || MAX_ACTIVE_SESSION_TOKENS <= 0) {
    return;
  }

  const activeTokens = await findActiveSessionTokensByUserRepository(userId);
  const totalExcess = activeTokens.length - MAX_ACTIVE_SESSION_TOKENS - pendingRevocations;

  if (totalExcess <= 0) {
    return;
  }

  const candidates = activeTokens.filter(({ id }) => !excludeIds.includes(id));

  if (!candidates.length) {
    return;
  }

  const idsToRevoke = candidates.slice(0, totalExcess).map(({ id }) => id);

  if (!idsToRevoke.length) {
    return;
  }

  await revokeSessionTokensByIdsRepository(idsToRevoke, {
    revokedReason: 'SESSION_LIMIT_EXCEEDED',
  });
};

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

    await enforceSessionTokenCap(userId, {
      excludeIds: [sessionToken.id],
      pendingRevocations: rotatedFromId ? 1 : 0,
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

    await enforceSessionTokenCap(existingToken.userId, {
      excludeIds: [newSessionToken.id],
      pendingRevocations: 1,
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

    if (!existingToken) {
      throw new UnauthorizedError('Invalid refresh token', {
        code: 'SESSION_TOKEN_NOT_FOUND',
      });
    }

    if (existingToken.revokedAt) {
      throw new UnauthorizedError('Refresh token has been revoked', {
        code: 'SESSION_TOKEN_REVOKED',
        ...(existingToken.revokedReason ? { detail: existingToken.revokedReason } : {}),
      });
    }

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