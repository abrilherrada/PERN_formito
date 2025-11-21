import bcrypt from 'bcryptjs';
import {
  updateUserRepository,
  findUserByIdRepository,
  findUsersRepository,
  softDeleteUserRepository,
  restoreUserRepository,
  suspendUserRepository
} from '../repositories/user.js';
import { findUserEmailByEmailRepository } from '../repositories/userEmail.js';
import { setPrimaryUserEmailService } from './userEmail.js';
import {
  BadRequestError,
  NotFoundError
} from '../utils/errors/httpErrors.js';
import { handlePrismaError } from '../utils/errors/prismaErrors.js';
import { EntityStatus } from '@prisma/client';
import { sanitizeUser } from '../utils/sanitizeUser.js';

export const findCurrentUserService = async (userId) => {
  try {
    const user = await findUserByIdRepository(userId);

    if (!user) {
      throw new NotFoundError('User not found', { code: 'USER_NOT_FOUND' });
    }

    return sanitizeUser(user);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const updateCurrentUserService = async (
  userId,
  { name, newPrimaryEmail, currentPassword, newPassword }
) => {
  try {
    if (!name && !newPrimaryEmail && (!currentPassword && !newPassword)) {
      throw new BadRequestError('No new data provided', { code: 'NO_NEW_USER_DATA' });
    }

    const user = await findUserByIdRepository(userId);

    if (!user) {
      throw new NotFoundError('User not found', { code: 'USER_NOT_FOUND' });
    }

    const dataToUpdate = {};

    if (name && name !== user.name) {
      dataToUpdate.name = name;
    }

    if (newPrimaryEmail) {
      const emailRecord = await findUserEmailByEmailRepository(newPrimaryEmail);

      if (!emailRecord || emailRecord.userId !== userId) {
        throw new BadRequestError('Email not found', { code: 'USER_EMAIL_NOT_FOUND' });
      }
      
      await setPrimaryUserEmailService({ userId, userEmailId: emailRecord.id });
    }

    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        throw new BadRequestError('Both current password and new password are required', {
          code: 'USER_PASSWORD_FLOW_INCOMPLETE',
        });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);

      if (!isValid) {
        throw new BadRequestError('Invalid password', { code: 'USER_INVALID_PASSWORD' });
      }

      const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
      dataToUpdate.password = hashedPassword;
    }

    if (!Object.keys(dataToUpdate).length) {
      return sanitizeUser(user);
    }

    const updated = await updateUserRepository(userId, dataToUpdate);

    return sanitizeUser(updated);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const deleteCurrentUserService = async (userId) => {
  try {
    const user = await findUserByIdRepository(userId);

    if (!user) {
      throw new NotFoundError('User not found', { code: 'USER_NOT_FOUND' });
    }

    if (user.status === EntityStatus.DELETED) {
      throw new BadRequestError('User is already deleted', { code: 'USER_ALREADY_DELETED' });
    }

    const deleted = await softDeleteUserRepository(userId);

    return sanitizeUser(deleted);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

// Only admins
export const getUsersService = async (filters = {}) => {
  try {
    const users = await findUsersRepository(filters);

    return users.map(user => sanitizeUser(user));
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const getUserByIdService = async (userId) => {
  try {
    const user = await findUserByIdRepository(userId, { includeDeleted: true });

    if (!user) {
      throw new NotFoundError('User not found', { code: 'USER_NOT_FOUND' });
    }

    return sanitizeUser(user);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const updateUserByIdService = async (userId, data = {}) => {
  try {
    const user = await findUserByIdRepository(userId, { includeDeleted: true });

    if (!user) {
      throw new NotFoundError('User not found', { code: 'USER_NOT_FOUND' });
    }

    const { role, status, ...profileData } = data;
    let updatedUser = user;

    if (status && status !== updatedUser.status) {
      if (status === EntityStatus.SUSPENDED && updatedUser.status !== EntityStatus.SUSPENDED) {
        updatedUser = await suspendUserRepository(userId);
      } else if (status === EntityStatus.ACTIVE && updatedUser.status !== EntityStatus.ACTIVE) {
        updatedUser = await restoreUserRepository(userId);
      } else if (status === EntityStatus.DELETED && updatedUser.status !== EntityStatus.DELETED) {
        updatedUser = await softDeleteUserRepository(userId);
      }
    }

    if (role && role !== updatedUser.role) {
      if (updatedUser.status !== EntityStatus.ACTIVE) {
        throw new BadRequestError('Cannot change role unless the user is active', {
          code: 'USER_ROLE_CHANGE_REQUIRES_ACTIVE',
        });
      }

      updatedUser = await updateUserRepository(userId, { role });
    }

    if (updatedUser.status === EntityStatus.ACTIVE) {
      const allowedFields = {};
      if (profileData.name && profileData.name !== updatedUser.name) {
        allowedFields.name = profileData.name;
      }
      if (profileData.plan && profileData.plan !== updatedUser.plan) {
        allowedFields.plan = profileData.plan;
      }
      if (
        profileData.maxSubmissions !== undefined &&
        profileData.maxSubmissions !== updatedUser.maxSubmissions
      ) {
        allowedFields.maxSubmissions = profileData.maxSubmissions;
      }

      if (Object.keys(allowedFields).length) {
        updatedUser = await updateUserRepository(userId, allowedFields);
      }
    }

    return sanitizeUser(updatedUser);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const deleteUserByIdService = async (userId) => {
  try {
    const user = await findUserByIdRepository(userId, { includeDeleted: true });

    if (!user) {
      throw new NotFoundError('User not found', { code: 'USER_NOT_FOUND' });
    }

    if (user.status === EntityStatus.DELETED) {
      throw new BadRequestError('User is already deleted', { code: 'USER_ALREADY_DELETED' });
    }

    const deleted = await softDeleteUserRepository(userId);

    return sanitizeUser(deleted);
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const restoreUserByIdService = async (userId) => {
  try {
    const user = await findUserByIdRepository(userId, { includeDeleted: true });

    if (!user) {
      throw new NotFoundError('User not found', { code: 'USER_NOT_FOUND' });
    }

    if (user.status === EntityStatus.ACTIVE) {
      throw new BadRequestError('User is already active', { code: 'USER_ALREADY_ACTIVE' });
    }

    const restored = await restoreUserRepository(userId);

    return sanitizeUser(restored);
  } catch (error) {
    throw handlePrismaError(error);
  }
};