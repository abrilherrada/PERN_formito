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

export const findSoftDeletedFormsRepository = async (cutoffDate) => {
  return prisma.form.findMany({
    where: {
      status: EntityStatus.DELETED,
      deletedAt: {
        not: null,
        lt: cutoffDate,
      },
      OR: [
        { purgedAt: null },
        { purgedAt: undefined },
      ],
    },
    include: {
      submissions: true,
    },
  });
};

export const anonymizeFormRepository = async (formId, data) => {
  return prisma.form.update({
    where: { id: formId },
    data,
  });
};