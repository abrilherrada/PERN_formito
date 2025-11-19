import { prisma } from '../../prisma/client.js';
import { EntityStatus } from '@prisma/client';

export const createFormRepository = async ({name, userId, destinationEmail}) => {
  return await prisma.form.create({
    data: { name, userId, destinationEmail }
  });
};

export const findFormByIdRepository = async (id) => {
  return await prisma.form.findFirst({
    where: {
      id,
      status: EntityStatus.ACTIVE,
      deletedAt: null
    }
  });
};

export const findFormsByUserIdRepository = async (userId, { includeDeleted = false } = {}) => {
  return await prisma.form.findMany({
    where: {
      userId,
      status: includeDeleted ? undefined : EntityStatus.ACTIVE,
      deletedAt: includeDeleted ? undefined : null
    }
  });
};

export const updateFormRepository = async (id, data) => {
  return await prisma.form.update({
    where: { id },
    data
  });
};

export const softDeleteFormRepository = async (id) => {
  return await prisma.form.update({
    where: { id },
    data: {
      status: EntityStatus.DELETED,
      deletedAt: new Date()
    }
  });
};

export const hardDeleteFormRepository = async (id) => {
  return await prisma.form.delete({ where: { id } });
};

export const restoreFormRepository = async (id) => {
  return await prisma.form.update({
    where: { id },
    data: {
      status: EntityStatus.ACTIVE,
      deletedAt: null
    }
  });
};

export const suspendFormRepository = async (id) => {
  return await prisma.form.update({
    where: { id },
    data: {
      status: EntityStatus.SUSPENDED
    }
  });
};

export const findFormByIdIncludingDeletedRepository = async (id) => {
  return await prisma.form.findFirst({
    where: { id }
  });
};