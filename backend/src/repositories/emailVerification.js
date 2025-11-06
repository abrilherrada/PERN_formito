import { prisma } from '../../prisma/client.js';

export const createTokenRepository = async ({ userId, userEmailId, expiresAt, token, type }) => {
  return await prisma.emailVerificationToken.create({
    data: { userId, userEmailId, expiresAt, token, type },
  });
};

export const findTokenByTokenRepository = async (token) => {
  return await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true, userEmail: true }
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

export const deleteTokensByUserEmailIdRepository = async (userEmailId) => {
  return await prisma.emailVerificationToken.deleteMany({
    where: { userEmailId }
  });
};

export const deleteExpiredTokensRepository = async (timestamp) => {
  return await prisma.emailVerificationToken.deleteMany({
    where: { expiresAt: { lt: timestamp } }
  });
};