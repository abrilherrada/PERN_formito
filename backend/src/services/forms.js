import {
  createFormRepository,
  findFormByIdRepository,
  findFormsByUserIdRepository,
  updateFormRepository,
  softDeleteFormRepository,
  restoreFormRepository,
  suspendFormRepository,
  findFormByIdIncludingDeletedRepository
} from '../repositories/form.js';
import {
  findUserEmailByEmailRepository
} from '../repositories/userEmail.js';
import {
  NotFoundError,
  BadRequestError
} from '../utils/errors/httpErrors.js';
import { handlePrismaError } from '../utils/errors/prismaErrors.js';
import { EntityStatus } from '@prisma/client';

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
    const form = await findFormByIdIncludingDeletedRepository(id);

    if (!form || form.userId !== userId) {
      throw new NotFoundError('Form not found', { code: 'FORM_NOT_FOUND' });
    }

    if (form.status === EntityStatus.DELETED) {
      throw new BadRequestError('Form is already deleted', { code: 'FORM_ALREADY_DELETED' });
    }

    return await softDeleteFormRepository(id);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const restoreFormService = async (id) => {
  try {
    const form = await findFormByIdIncludingDeletedRepository(id);

    if (!form) {
      throw new NotFoundError('Form not found', { code: 'FORM_NOT_FOUND' });
    }

    if (form.status === EntityStatus.ACTIVE) {
      throw new BadRequestError('Form is already active', { code: 'FORM_ALREADY_ACTIVE' });
    }

    return await restoreFormRepository(id);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const suspendFormService = async (id) => {
  try {
    const form = await findFormByIdIncludingDeletedRepository(id);

    if (!form) {
      throw new NotFoundError('Form not found', { code: 'FORM_NOT_FOUND' });
    }

    if (form.status === EntityStatus.DELETED) {
      throw new BadRequestError('Cannot suspend a deleted form', { code: 'FORM_DELETED' });
    }

    if (form.status === EntityStatus.SUSPENDED) {
      throw new BadRequestError('Form is already suspended', { code: 'FORM_ALREADY_SUSPENDED' });
    }

    return await suspendFormRepository(id);
  } catch (error) {
    throw handlePrismaError(error);
  }
};