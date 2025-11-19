import { prisma } from '../../prisma/client.js';
import { EntityStatus } from '@prisma/client';

export const updateUserRepository = async (userId, data) => {
  return await prisma.user.update({
    where: {
      id: userId,
      status: EntityStatus.ACTIVE,
      deletedAt: null
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

export const softDeleteUserRepository = async (userId) => {
  return prisma.user.update({
    where: {
      id: userId,
      status: EntityStatus.ACTIVE
    },
    data: {
      status: EntityStatus.DELETED,
      deletedAt: new Date()
    }
  });
};

export const hardDeleteUserRepository = async (userId) => {
  return prisma.user.delete({ where: { id: userId } });
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