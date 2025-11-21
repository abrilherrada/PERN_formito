import {
  createSubmissionRepository,
  findSubmissionsByFormIdRepository,
  findSubmissionByIdRepository,
  softDeleteSubmissionRepository,
  restoreSubmissionRepository
} from '../repositories/submission.js';
import { updateUserRepository, findUserByIdRepository } from '../repositories/user.js';
import { findFormByIdIncludingDeletedRepository } from '../repositories/form.js';
import { findFormByIdService } from './forms.js';
import { sendSubmissionEmail } from './email/sendSubmissionEmail.js';
import {
  BadRequestError,
  NotFoundError
} from '../utils/errors/httpErrors.js';
import { handlePrismaError } from '../utils/errors/prismaErrors.js';
import { EntityStatus } from '@prisma/client';

export const createSubmissionService = async ({formId, data}) => {
  try {
    const form = await findFormByIdIncludingDeletedRepository(formId);

    if (!form || form.status === EntityStatus.DELETED) {
      throw new NotFoundError('Form not found', { code: 'FORM_NOT_FOUND' });
    }

    if (form.status === EntityStatus.SUSPENDED) {
      throw new BadRequestError('Form is suspended', { code: 'FORM_SUSPENDED' });
    }

    const account = await findUserByIdRepository(form.userId, { includeDeleted: true });

    if (!account || account.status === EntityStatus.DELETED) {
      throw new NotFoundError('User not found', { code: 'USER_NOT_FOUND' });
    }

    if (account.status === EntityStatus.SUSPENDED) {
      throw new BadRequestError('User account suspended', { code: 'USER_ACCOUNT_SUSPENDED' });
    }

    if (account.currentSubmissions >= account.maxSubmissions) {
      throw new BadRequestError('Max submissions reached', { code: 'FORM_MAX_SUBMISSIONS_REACHED' });
    }

    await sendSubmissionEmail({
      to: form.destinationEmail,
      formName: form.name,
      formId,
      data
    });

    await updateUserRepository(account.id, {
      currentSubmissions: account.currentSubmissions + 1,
    });

    return await createSubmissionRepository({ formId, data });
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const findSubmissionsByFormIdService = async (formId, userId) => {
  try {
    const form = await findFormByIdService(formId, userId);

    if (!form) {
      throw new NotFoundError('Form not found', { code: 'FORM_NOT_FOUND' });
    }

    return await findSubmissionsByFormIdRepository(formId);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const findSubmissionByIdService = async (id, userId, formId) => {
  try {
    const submission = await findSubmissionByIdRepository(id);

    if (!submission || submission.form.userId !== userId || submission.form.id !== formId) {
      throw new NotFoundError('Submission not found', { code: 'SUBMISSION_NOT_FOUND' });
    }

    return submission;
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const softDeleteSubmissionService = async ({ id, userId }) => {
  try {
    const submission = await findSubmissionByIdRepository(id, { includeDeleted: true });

    if (!submission || submission.form.userId !== userId) {
      throw new NotFoundError('Submission not found', { code: 'SUBMISSION_NOT_FOUND' });
    }

    if (submission.status === EntityStatus.DELETED) {
      throw new BadRequestError('Submission is already deleted', { code: 'SUBMISSION_ALREADY_DELETED' });
    }

    return await softDeleteSubmissionRepository(id);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const restoreSubmissionService = async ({ id, userId }) => {
  try {
    const submission = await findSubmissionByIdRepository(id, { includeDeleted: true });

    if (!submission || submission.form.userId !== userId) {
      throw new NotFoundError('Submission not found', { code: 'SUBMISSION_NOT_FOUND' });
    }

    if (submission.status === EntityStatus.ACTIVE) {
      throw new BadRequestError('Submission is already active', { code: 'SUBMISSION_ALREADY_ACTIVE' });
    }

    return await restoreSubmissionRepository(id);
  } catch (error) {
    throw handlePrismaError(error);
  }
};
