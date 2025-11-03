import { prisma } from '../../prisma/client.js';

export const registerRepository = async (data) => {
  return await prisma.user.create({ data });
};

export const loginRepository = async (data) => {
  return await prisma.user.findUnique({
    where: { email: data.email }
  });
};