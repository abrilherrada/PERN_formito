import { prisma } from '../../prisma/client.js';

export const createUserEmailRepository = async ({
  userId,
  email,
  isPrimary,
  emailVerifiedAt = null
}) => {
  return await prisma.userEmail.create({
    data: { userId, email, isPrimary, emailVerifiedAt }
  });
};

export const findUserEmailByIdRepository = async (userEmailId) => {
  return await prisma.userEmail.findUnique({
    where: { id: userEmailId }
  });
};

export const findUserEmailByEmailRepository = async (email) => {
  return await prisma.userEmail.findUnique({
    where: { email }
  });
};

export const findUserEmailsByUserIdRepository = async (userId) => {
  return await prisma.userEmail.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' }
  });
};

export const findPrimaryUserEmailRepository = async (userId) => {
  return await prisma.userEmail.findFirst({
    where: { userId, isPrimary: true }
  });
};

export const updateUserEmailRepository = async (userEmailId, data) => {
  return await prisma.userEmail.update({
    where: { id: userEmailId },
    data
  });
};

export const deleteUserEmailRepository = async (userEmailId) => {
  return await prisma.userEmail.delete({
    where: { id: userEmailId }
  });
};

export const anonymizeUserEmailRepository = async (userEmailId, data) => {
  return prisma.userEmail.update({
    where: { id: userEmailId },
    data,
  });
};