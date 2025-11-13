import { prisma } from '../../prisma/client.js';

export const createFormRepository = async ({name, userId, destinationEmail}) => {
  return await prisma.form.create({
    data: { name, userId, destinationEmail }
  });
};

export const findFormByIdRepository = async (id) => {
  return await prisma.form.findUnique({
    where: { id }
  });
};

export const findFormsByUserIdRepository = async (userId) => {
  return await prisma.form.findMany({
    where: { userId }
  });
};

export const updateFormRepository = async (id, data) => {
  return await prisma.form.update({
    where: { id },
    data
  });
};

export const deleteFormRepository = async (id) => {
  return await prisma.form.delete({
    where: { id }
  });
};