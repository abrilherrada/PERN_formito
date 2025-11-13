import { prisma } from '../../prisma/client.js';

export const createSubmissionRepository = async ({formId, data}) => {
  return await prisma.submission.create({
    data: { formId, data }
  });
};

export const findSubmissionsByFormIdRepository = async (formId) => {
  return await prisma.submission.findMany({
    where: { formId },
    orderBy: { createdAt: 'desc' }
  });
};

export const findSubmissionByIdRepository = async (id) => {
  return await prisma.submission.findUnique({
    where: { id },
    include: { form: true }
  });
};