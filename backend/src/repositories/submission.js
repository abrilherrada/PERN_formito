import { prisma } from '../../prisma/client.js';
import { EntityStatus } from '@prisma/client';

export const createSubmissionRepository = async ({formId, data}) => {
  return await prisma.submission.create({
    data: { formId, data }
  });
};

export const findSubmissionsByFormIdRepository = async (formId, { includeDeleted = false } = {}) => {
  return prisma.submission.findMany({
    where: {
      formId,
      status: includeDeleted ? undefined : EntityStatus.ACTIVE,
      deletedAt: includeDeleted ? undefined : null,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const findSubmissionByIdRepository = async (id, { includeDeleted = false } = {}) => {
  return prisma.submission.findFirst({
    where: {
      id,
      status: includeDeleted ? undefined : EntityStatus.ACTIVE,
      deletedAt: includeDeleted ? undefined : null,
    },
    include: { form: true },
  });
};

export const softDeleteSubmissionRepository = async (id) => {
  return await prisma.submission.update({
    where: { id },
    data: {
      status: EntityStatus.DELETED,
      deletedAt: new Date()
    }
  });
};

export const restoreSubmissionRepository = async (id) => {
  return await prisma.submission.update({
    where: { id },
    data: {
      status: EntityStatus.ACTIVE,
      deletedAt: null
    }
  });
};

export const findSoftDeletedSubmissionsRepository = async (cutoffDate) => {
  return prisma.submission.findMany({
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
  });
};

export const anonymizeSubmissionRepository = async (submissionId, data) => {
  return prisma.submission.update({
    where: { id: submissionId },
    data,
  });
};