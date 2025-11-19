import { prisma } from '../../prisma/client.js';
import { EntityStatus } from '@prisma/client';

export const registerRepository = async (data) => {
  return await prisma.user.create({ data });
};

export const loginRepository = async (data) => {
  return await prisma.user.findFirst({
    where: {
      email: data.email,
      status: EntityStatus.ACTIVE,
      deletedAt: null
    },
    include: {
      userEmails: {
        where: { isPrimary: true },
      },
    },
  });
};