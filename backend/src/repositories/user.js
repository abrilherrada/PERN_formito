import { prisma } from '../../prisma/client.js';

export const updateUserRepository = async (userId, data) => {
  return await prisma.user.update({
    where: { id: userId },
    data,
  });
};