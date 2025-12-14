import { prisma } from '../../prisma/client.js';

const buildInclude = ({ includeUser = false, includeRelations = false } = {}) => {
  const include = {};

  if (includeUser) {
    include.user = true;
  }

  if (includeRelations) {
    include.rotatedFrom = true;
    include.replacedByToken = true;
  }

  return Object.keys(include).length ? include : undefined;
};

export const createSessionTokenRepository = async ({
  userId,
  tokenHash,
  expiresAt,
  userAgent = null,
  ipAddress = null,
  rotatedFromId = null,
}) => {
  return await prisma.sessionToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
      ...(rotatedFromId
        ? {
            rotatedFrom: {
              connect: { id: rotatedFromId },
            },
          }
        : {}),
    },
  });
};

export const findSessionTokenByIdRepository = async (
  sessionTokenId,
  { includeUser = false, includeRelations = false } = {}
) => {
  const include = buildInclude({ includeUser, includeRelations });

  return await prisma.sessionToken.findUnique({
    where: { id: sessionTokenId },
    ...(include ? { include } : {}),
  });
};

export const findSessionTokenByHashRepository = async (
  tokenHash,
  { includeUser = false, includeRelations = false } = {}
) => {
  const include = buildInclude({ includeUser, includeRelations });

  return await prisma.sessionToken.findUnique({
    where: { tokenHash },
    ...(include ? { include } : {}),
  });
};

export const updateSessionTokenRepository = async (sessionTokenId, data) => {
  return await prisma.sessionToken.update({
    where: { id: sessionTokenId },
    data,
  });
};

export const revokeSessionTokensForUserRepository = async (
  userId,
  { excludeIds = [], revokedAt = new Date(), revokedReason } = {}
) => {
  const where = {
    userId,
    revokedAt: null,
    ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
  };

  const data = {
    revokedAt,
  };

  if (revokedReason !== undefined) {
    data.revokedReason = revokedReason;
  }

  return await prisma.sessionToken.updateMany({
    where,
    data,
  });
};

export const findActiveSessionTokensByUserRepository = async (userId) => {
  return await prisma.sessionToken.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      createdAt: true,
    },
  });
};

export const revokeSessionTokensByIdsRepository = async (
  ids,
  { revokedAt = new Date(), revokedReason } = {}
) => {
  if (!ids.length) {
    return { count: 0 };
  }

  const data = {
    revokedAt,
  };

  if (revokedReason !== undefined) {
    data.revokedReason = revokedReason;
  }

  return await prisma.sessionToken.updateMany({
    where: {
      id: {
        in: ids,
      },
    },
    data,
  });
};