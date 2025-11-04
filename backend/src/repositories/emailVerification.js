import { prisma } from '../../prisma/client.js';

export const createTokenRepository = async (userId, expiresAt, token) => {
  return await prisma.emailVerificationToken.create({
    data: { userId, expiresAt, token },
  });
};

export const findTokenByTokenRepository = async (token) => {
  return await prisma.emailVerificationToken.findUnique({
    where: { token }
  });
};

export const markTokenAsUsedRepository = async (id, usedAt = new Date()) => {
  return await prisma.emailVerificationToken.update({
    where: { id },
    data: { usedAt },
  });
};

export const deleteTokenRepository = async (id) => {
  return await prisma.emailVerificationToken.delete({
    where: { id }
  });
};

export const deleteTokensByUserIdRepository = async (userId) => {
  return await prisma.emailVerificationToken.deleteMany({
    where: { userId }
  });
};

export const deleteExpiredTokensRepository = async (timestamp) => {
  return await prisma.emailVerificationToken.deleteMany({
    where: { expiresAt: { lt: timestamp } }
  });
};