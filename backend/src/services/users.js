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
import {
  createUserEmailService,
  resendUserEmailVerificationService,
  setPrimaryUserEmailService
} from './userEmails.js';
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

    const ops = {
      updateName: Boolean(name && name !== user.name),
      updatePassword: Boolean(currentPassword && newPassword),
      updateEmail: Boolean(newPrimaryEmail && newPrimaryEmail !== user.email)
    };

    if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
      throw new BadRequestError('Both current password and new password are required', {
        code: 'USER_PASSWORD_FLOW_INCOMPLETE',
      });
    }

    if (ops.updateEmail && !currentPassword) {
      throw new BadRequestError('Current password is required to update email', { code: 'USER_PASSWORD_REQUIRED' });
    }

    const dataToUpdate = {};
    let pendingPrimaryEmail;
    let hasVerifiedCurrentPassword = false;

    const validateCurrentPassword = async () => {
      if (hasVerifiedCurrentPassword) return;

      const isValid = await bcrypt.compare(currentPassword, user.password);

      if (!isValid) {
        throw new BadRequestError('Invalid password', { code: 'USER_INVALID_PASSWORD' });
      }

      hasVerifiedCurrentPassword = true;
    };

    if (ops.updateName) {
      dataToUpdate.name = name;
    }

    if (ops.updatePassword) {
      await validateCurrentPassword();

      const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
      dataToUpdate.password = hashedPassword;
    }

    if (Object.keys(dataToUpdate).length) {
      await updateUserRepository(userId, dataToUpdate);
    }

    if (ops.updateEmail) {
      await validateCurrentPassword();

      const emailRecord = await findUserEmailByEmailRepository(newPrimaryEmail);

      if (!emailRecord) {
        await createUserEmailService({ userId, email: newPrimaryEmail });
        pendingPrimaryEmail = newPrimaryEmail;
      } else if (emailRecord.userId !== userId) {
        throw new BadRequestError('Cannot use this email', { code: 'USER_EMAIL_FORBIDDEN' });
      } else if (emailRecord.emailVerifiedAt) {
        await setPrimaryUserEmailService({ userId, userEmailId: emailRecord.id });
      } else if (!emailRecord.emailVerifiedAt) {
        await resendUserEmailVerificationService({ userId, userEmailId: emailRecord.id });
        pendingPrimaryEmail = newPrimaryEmail;
      }
    }

    const freshUser = await findUserByIdRepository(userId);
    const sanitized = sanitizeUser(freshUser);

    if (pendingPrimaryEmail) {
      sanitized.pendingPrimaryEmail = pendingPrimaryEmail;
    }

    return sanitized;
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
    let roleUpdateError = null;

    const applyProfileUpdates = async () => {
      if (!Object.keys(profileData).length) {
        return;
      }

      if (
        updatedUser.status !== EntityStatus.ACTIVE &&
        updatedUser.status !== EntityStatus.SUSPENDED
      ) {
        throw new BadRequestError('User must be active or suspended to update profile', {
          code: 'USER_PROFILE_EDIT_REQUIRES_ACTIVE_OR_SUSPENDED',
        });
      }

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
    };

    const applyStatusTransition = async () => {
      if (!status || status === updatedUser.status) {
        return;
      }

      if (status === EntityStatus.DELETED) {
        if (updatedUser.status === EntityStatus.DELETED) {
          throw new BadRequestError('User is already deleted', { code: 'USER_ALREADY_DELETED' });
        }

        updatedUser = await softDeleteUserRepository(userId);
        return;
      }

      if (status === EntityStatus.ACTIVE) {
        if (updatedUser.status === EntityStatus.ACTIVE) {
          return;
        }

        updatedUser = await restoreUserRepository(userId);
        return;
      }

      if (status === EntityStatus.SUSPENDED) {
        if (updatedUser.status === EntityStatus.SUSPENDED) {
          return;
        }

        if (updatedUser.status === EntityStatus.DELETED) {
          await restoreUserRepository(userId);
          updatedUser = await suspendUserRepository(userId);
          return;
        }

        updatedUser = await suspendUserRepository(userId);
        return;
      }

      throw new BadRequestError('Invalid status transition', {
        code: 'USER_STATUS_TRANSITION_INVALID',
      });
    };

    const applyRoleChange = async () => {
      if (!role || role === updatedUser.role) {
        return;
      }

      const isPromotion = updatedUser.role !== UserRole.ADMIN && role === UserRole.ADMIN;
      const isDemotion = updatedUser.role === UserRole.ADMIN && role !== UserRole.ADMIN;

      if (isPromotion && updatedUser.status !== EntityStatus.ACTIVE) {
        roleUpdateError = new BadRequestError('Cannot promote user unless they are active', {
          code: 'USER_PROMOTION_REQUIRES_ACTIVE',
        });
        return;
      }

      if (isDemotion || isPromotion) {
        updatedUser = await updateUserRepository(userId, { role });
      }
    };

    await applyStatusTransition();
    await applyProfileUpdates();
    await applyRoleChange();

    if (roleUpdateError) {
      throw roleUpdateError;
    }

    const freshUser = await findUserByIdRepository(userId, { includeDeleted: true });

    return sanitizeUser(freshUser ?? updatedUser);
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