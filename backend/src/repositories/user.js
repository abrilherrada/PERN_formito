import { prisma } from '../../prisma/client.js';
import { EntityStatus } from '@prisma/client';

export const updateUserRepository = async (userId, data, { client } = {}) => {
  const db = client ?? prisma;

  return await db.user.update({
    where: {
      id: userId,
      deletedAt: null,
      status: {
        in: [EntityStatus.ACTIVE, EntityStatus.SUSPENDED],
      },
    },
    data,
  });
};

export const findUserByIdRepository = async (userId, { includeDeleted = false } = {}) => {
  return prisma.user.findFirst({
    where: {
      id: userId,
      status: includeDeleted ? undefined : EntityStatus.ACTIVE,
      deletedAt: includeDeleted ? undefined : null,
    },
  });
};

export const findUserByEmailRepository = async (email, { includeDeleted = false } = {}) => {
  return prisma.user.findFirst({
    where: {
      email,
      status: includeDeleted ? undefined : EntityStatus.ACTIVE,
      deletedAt: includeDeleted ? undefined : null
    }
  });
};

export const findUsersRepository = async ({
  status,
  search,
  includeDeleted = false,
  take,
  skip,
} = {}) => {
  return prisma.user.findMany({
    where: {
      status: status ?? undefined,
      deletedAt: includeDeleted ? undefined : null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    take,
    skip,
    orderBy: { createdAt: 'desc' },
  });
};

export const findUsersDueForSubmissionResetRepository = async (referenceDate) => {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      status: {
        in: [EntityStatus.ACTIVE, EntityStatus.SUSPENDED],
      },
      OR: [
        { nextSubmissionResetAt: null },
        { nextSubmissionResetAt: { lte: referenceDate } },
      ],
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
};

export const softDeleteUserRepository = async (userId) => {
  return prisma.user.update({
    where: {
      id: userId,
      status: {
        in: [EntityStatus.ACTIVE, EntityStatus.SUSPENDED],
      },
      deletedAt: null,
    },
    data: {
      status: EntityStatus.DELETED,
      deletedAt: new Date()
    },
  });
};

export const restoreUserRepository = async (userId) => {
  return prisma.user.update({
    where: {
      id: userId,
      status: {
        in: [EntityStatus.DELETED, EntityStatus.SUSPENDED],
      },
    },
    data: {
      status: EntityStatus.ACTIVE,
      deletedAt: null,
    },
  });
};

export const suspendUserRepository = async (userId) => {
  return prisma.user.update({
    where: { id: userId, deletedAt: null },
    data: { status: EntityStatus.SUSPENDED },
  });
};

export const updateUserCredentialsTimestampRepository = async (userId, { client } = {}) => {
  const db = client ?? prisma;

  return await db.user.update({
    where: { id: userId },
    data: { credentialsUpdatedAt: new Date() },
  });
};

export const findSoftDeletedUsersRepository = async (cutoffDate) => {
  return prisma.user.findMany({
    where: {
      status: EntityStatus.DELETED,
      deletedAt: {
        not: null,
        lt: cutoffDate,
      },
      OR: [
        { purgedAt: null },
        { purgedAt: undefined },
      ],
    },
    include: {
      userEmails: true,
      forms: {
        include: {
          submissions: true,
        },
      },
    },
  });
};

export const anonymizeUserRepository = async (userId, data) => {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
};