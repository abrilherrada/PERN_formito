import { prisma } from '../../prisma/client.js';

export const updateUserRepository = async (userId, data) => {
  return await prisma.user.update({
    where: { id: userId },
    data,
  });
};

export const findUserByIdRepository = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
  });
};