import { EmailVerificationTokenType } from '@prisma/client';
import {
  createUserEmailRepository,
  findUserEmailByIdRepository,
  findUserEmailByEmailRepository,
  findUserEmailsByUserIdRepository,
  findPrimaryUserEmailRepository,
  updateUserEmailRepository,
  deleteUserEmailRepository
} from '../repositories/userEmail.js';
import { updateUserRepository } from '../repositories/user.js';
import { deleteTokensByUserEmailIdRepository } from '../repositories/emailVerification.js';
import {
  createTokenService,
  consumeTokenService,
  deleteTokenService
} from './emailVerification.js';
import { sendVerificationEmail } from './email/sendVerificationEmail.js';
import {
  BadRequestError,
  NotFoundError,
} from '../utils/errors/httpErrors.js';
import { handlePrismaError } from '../utils/errors/prismaErrors.js';

export const createUserEmailService = async ({ userId, email }) => {
  let verificationToken;

  try {
    const existingUserEmail = await findUserEmailByEmailRepository(email);

    if (existingUserEmail) {
      throw new BadRequestError('Email already exists', { code: 'EMAIL_ALREADY_EXISTS' });
    }

    const newUserEmail = await createUserEmailRepository({ userId, email, isPrimary: false });

    verificationToken = await createTokenService({
      userEmailId: newUserEmail.id,
      type: EmailVerificationTokenType.SECONDARY_EMAIL
    });

    await sendVerificationEmail({
      to: email,
      token: verificationToken.token,
      type: EmailVerificationTokenType.SECONDARY_EMAIL
    });

    return {
      userEmailId: newUserEmail.id,
      message: 'A verification email has been sent to the set email address.',
    };
  } catch (error) {
    if (verificationToken?.id) {
      try {
        await deleteTokenService(verificationToken.id);
      } catch (cleanupError) {
        console.error('Failed to delete verification token after email creation error', cleanupError);
      }
    }
    throw handlePrismaError(error);
  }
};

export const verifyUserEmailService = async (tokenString) => {
  try {
    const token = await consumeTokenService(tokenString, EmailVerificationTokenType.SECONDARY_EMAIL);

    const verifiedAt = new Date();

    const verifiedUserEmail = await updateUserEmailRepository(
      token.userEmailId,
      { emailVerifiedAt: verifiedAt }
    );

    if (verifiedUserEmail.isPrimary) {
      await setPrimaryUserEmailService({
        userId: verifiedUserEmail.userId,
        userEmailId: verifiedUserEmail.id
      });
    }

    return {
      userEmailId: verifiedUserEmail.id,
      emailVerifiedAt: verifiedUserEmail.emailVerifiedAt,
      message: 'Email verified successfully.',
    };
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const resendUserEmailVerificationService = async ({ userId, userEmailId }) => {
  let verificationToken;

  try {
    const email = await findUserEmailByIdRepository(userEmailId);

    if (!email || email.userId !== userId) {
      throw new NotFoundError('User email not found', { code: 'USER_EMAIL_NOT_FOUND' });
    }

    if (email.emailVerifiedAt) {
      throw new BadRequestError('Email already verified', { code: 'USER_EMAIL_ALREADY_VERIFIED' });
    }

    verificationToken = await createTokenService({
      userEmailId: email.id,
      type: EmailVerificationTokenType.SECONDARY_EMAIL
    });

    await sendVerificationEmail({
      to: email.email,
      token: verificationToken.token,
      type: EmailVerificationTokenType.SECONDARY_EMAIL
    });

    return {
      userEmailId: email.id,
      message: 'Verification email resent successfully.',
    };
  } catch (error) {
    if (verificationToken?.id) {
      try {
        await deleteTokenService(verificationToken.id);
      } catch (cleanupError) {
        console.error('Failed to delete verification token after resend error', cleanupError);
      }
    }

    throw handlePrismaError(error);
  }
};

export const setPrimaryUserEmailService = async ({ userId, userEmailId }) => {
  try {
    const email = await findUserEmailByIdRepository(userEmailId);

    if (!email || email.userId !== userId) {
      throw new NotFoundError('User email not found', { code: 'USER_EMAIL_NOT_FOUND' });
    }

    if (!email.emailVerifiedAt) {
      throw new BadRequestError('Email not verified', { code: 'USER_EMAIL_NOT_VERIFIED' });
    }

    const currentPrimaryEmail = await findPrimaryUserEmailRepository(userId);

    if (currentPrimaryEmail && currentPrimaryEmail.id !== email.id) {   
      await updateUserEmailRepository(currentPrimaryEmail.id, { isPrimary: false });
    }

    await updateUserEmailRepository(email.id, { isPrimary: true });

    await updateUserRepository(userId, { email: email.email });

    return {
      userEmailId: email.id,
      message: 'Email set as primary successfully.',
    };
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const deleteUserEmailService = async ({ userId, userEmailId }) => {
  try {
    const email = await findUserEmailByIdRepository(userEmailId);

    if (!email || email.userId !== userId) {
      throw new NotFoundError('User email not found', { code: 'USER_EMAIL_NOT_FOUND' });
    }

    if (email.isPrimary) {
      throw new BadRequestError('Primary email cannot be deleted', { code: 'USER_EMAIL_PRIMARY_DELETE_FORBIDDEN' });
    }

    await deleteTokensByUserEmailIdRepository(userEmailId);

    await deleteUserEmailRepository(userEmailId);

    return {
      userEmailId: email.id,
      message: 'Email deleted successfully.',
    };
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const getUserEmailsService = async (userId) => {
  try {
    const emails = await findUserEmailsByUserIdRepository(userId);

    return emails;
  } catch (error) {
    throw handlePrismaError(error);
  }
};