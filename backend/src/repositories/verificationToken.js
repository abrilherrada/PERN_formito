import { prisma } from '../../prisma/client.js';

export const createTokenRepository = async ({
  userId,
  userEmailId,
  expiresAt,
  tokenSelector,
  tokenHash,
  type
}) => {
  return await prisma.verificationToken.create({
    data: {
      userId,
      userEmailId,
      expiresAt,
      tokenSelector,
      tokenHash,
      type
    },
  });
};

export const findTokenBySelectorRepository = async (tokenSelector) => {
  return await prisma.verificationToken.findUnique({
    where: { tokenSelector },
    include: { user: true, userEmail: true },
  });
};

export const markTokenAsUsedRepository = async (id, usedAt = new Date()) => {
  return await prisma.verificationToken.update({
    where: { id },
    data: { usedAt },
  });
};

export const deleteTokenRepository = async (id) => {
  return await prisma.verificationToken.delete({
    where: { id }
  });
};

export const deleteTokensByUserIdRepository = async (userId) => {
  return await prisma.verificationToken.deleteMany({
    where: { userId }
  });
};

export const deleteTokensByUserEmailIdRepository = async (userEmailId) => {
  return await prisma.verificationToken.deleteMany({
    where: { userEmailId }
  });
};

export const deleteExpiredTokensRepository = async (timestamp) => {
  return await prisma.verificationToken.deleteMany({
    where: { expiresAt: { lt: timestamp } }
  });
};