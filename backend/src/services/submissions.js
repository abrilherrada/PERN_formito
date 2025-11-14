import {
  createSubmissionRepository,
  findSubmissionsByFormIdRepository,
  findSubmissionByIdRepository
} from '../repositories/submission.js';
import { updateUserRepository, findUserByIdRepository } from '../repositories/user.js';
import { findFormByIdRepository } from '../repositories/form.js';
import { findFormByIdService } from './forms.js';
import { sendSubmissionEmail } from './email/sendSubmissionEmail.js';
import {
  BadRequestError,
  NotFoundError
} from '../utils/errors/httpErrors.js';
import { handlePrismaError } from '../utils/errors/prismaErrors.js';

export const createSubmissionService = async ({formId, data}) => {
  try {
    const form = await findFormByIdRepository(formId);

    if (!form) {
      throw new NotFoundError('Form not found', { code: 'FORM_NOT_FOUND' });
    }

    const user = await findUserByIdRepository(form.userId);

    if (!user) {
      throw new NotFoundError('User not found', { code: 'USER_NOT_FOUND' });
    }

    if (user.currentSubmissions >= user.maxSubmissions) {
      throw new BadRequestError('Max submissions reached', { code: 'FORM_MAX_SUBMISSIONS_REACHED' });
    }

    await sendSubmissionEmail({
      to: form.destinationEmail,
      formName: form.name,
      formId,
      data
    });

    await updateUserRepository(user.id, {
      currentSubmissions: user.currentSubmissions + 1,
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

    if (!submission) {
      throw new NotFoundError('Submission not found', { code: 'SUBMISSION_NOT_FOUND' });
    }

    if (submission.form.userId !== userId) {
      throw new NotFoundError('Submission not found', { code: 'SUBMISSION_NOT_FOUND' });
    }

    if (submission.form.id !== formId) {
      throw new NotFoundError('Submission not found', { code: 'SUBMISSION_NOT_FOUND' });
    }

    return submission;
  } catch (error) {
    throw handlePrismaError(error);
  }
};