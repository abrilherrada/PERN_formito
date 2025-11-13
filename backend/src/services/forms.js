import {
  createFormRepository,
  findFormByIdRepository,
  findFormsByUserIdRepository,
  updateFormRepository,
  deleteFormRepository
} from '../repositories/form.js';
import {
  findUserEmailByEmailRepository
} from '../repositories/userEmail.js';
import {
  NotFoundError,
  BadRequestError
} from '../utils/errors/httpErrors.js';
import { handlePrismaError } from '../utils/errors/prismaErrors.js';

export const createFormService = async ({name, userId, destinationEmail}) => {
  try {
    const userEmail = await findUserEmailByEmailRepository(destinationEmail);

    if (!userEmail) {
      throw new NotFoundError('User email not found', { code: 'USER_EMAIL_NOT_FOUND' });
    }

    if (userEmail.userId !== userId) {
      throw new NotFoundError('User email not found', { code: 'USER_EMAIL_NOT_FOUND' });
    }

    if (!userEmail.emailVerifiedAt) {
      throw new BadRequestError('User email not verified', { code: 'USER_EMAIL_NOT_VERIFIED' });
    }

    return await createFormRepository({name, userId, destinationEmail});
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const findFormByIdService = async (id, userId) => {
  try {
    const form = await findFormByIdRepository(id);

    if (!form) {
      throw new NotFoundError('Form not found', { code: 'FORM_NOT_FOUND' });
    }

    if (form.userId !== userId) {
      throw new NotFoundError('Form not found', { code: 'FORM_NOT_FOUND' });
    }

    return form;
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const findFormsByUserIdService = async (userId) => {
  try {
    const forms = await findFormsByUserIdRepository(userId);

    return forms;
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const updateFormService = async (id, data, userId) => {
  try {
    const form = await findFormByIdService(id, userId);

    if (!data.name && !data.destinationEmail) {
      throw new BadRequestError('New name or destination email are required', { code: 'NO_NEW_FORM_DATA' });
    }

    if (data.name === form.name && data.destinationEmail === form.destinationEmail) {
      throw new BadRequestError('No changes detected', { code: 'NO_CHANGES_DETECTED' });
    }

    if (data.destinationEmail) {
      const userEmail = await findUserEmailByEmailRepository(data.destinationEmail);

      if (!userEmail) {
        throw new NotFoundError('User email not found', { code: 'USER_EMAIL_NOT_FOUND' });
      }

      if (userEmail.userId !== userId) {
        throw new NotFoundError('User email not found', { code: 'USER_EMAIL_NOT_FOUND' });
      }

      if (!userEmail.emailVerifiedAt) {
        throw new BadRequestError('User email not verified', { code: 'USER_EMAIL_NOT_VERIFIED' });
      }
    }

    return await updateFormRepository(id, data);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const deleteFormService = async (id, userId) => {
  try {
    await findFormByIdService(id, userId);

    return await deleteFormRepository(id);
  } catch (error) {
    throw handlePrismaError(error);
  }
};
