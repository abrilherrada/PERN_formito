import { prisma } from '../../prisma/client.js';
import { EntityStatus } from '@prisma/client';

export const registerRepository = async (data) => {
  return await prisma.user.create({ data });
};

export const loginRepository = async (email, { includeDeleted = false } = {}) => {
  return await prisma.user.findFirst({
    where: {
      email,
      status: includeDeleted ? undefined : EntityStatus.ACTIVE,
      deletedAt: includeDeleted ? undefined : null
    },
    include: {
      userEmails: {
        where: { isPrimary: true },
      },
    },
  });
};