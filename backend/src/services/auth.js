import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  registerRepository,
  loginRepository,
} from '../repositories/auth.js';
import {
  createUserEmailRepository,
  findUserEmailByEmailRepository,
  updateUserEmailRepository,
  findPrimaryUserEmailRepository,
  findUserEmailsByUserIdRepository
} from '../repositories/userEmail.js';
import {
  InternalServerError,
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
  ConflictError
} from '../utils/errors/httpErrors.js';
import { handlePrismaError } from '../utils/errors/prismaErrors.js';
import {
  createTokenService,
  deleteTokenService,
  consumeTokenService,
} from './emailVerification.js';
import { sendVerificationEmail } from './email/sendVerificationEmail.js';
import { EmailVerificationTokenType } from '@prisma/client';

export const registerService = async (data) => {
  let verificationToken;

  try {
    const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await registerRepository({ ...data, password: hashedPassword });

    const existingUserEmail = await findUserEmailByEmailRepository(user.email);

    if (existingUserEmail) {
      if (existingUserEmail.userId !== user.id) {
        throw new ConflictError('Email already associated with another account', {
          code: 'EMAIL_ALREADY_ASSOCIATED',
        });
      }
    } else {
      await createUserEmailRepository({
        userId: user.id,
        email: user.email,
        isPrimary: true,
      });
    }

    verificationToken = await createTokenService({
      userId: user.id,
      type: EmailVerificationTokenType.ACCOUNT_EMAIL,
    });

    await sendVerificationEmail({ to: user.email, token: verificationToken.token, type: EmailVerificationTokenType.ACCOUNT_EMAIL });

    return {
      userId: user.id,
      message: 'A verification email has been sent to the set email address.',
    };
  } catch (error) {
    if (verificationToken?.id) {
      try {
        await deleteTokenService(verificationToken.id);
      } catch (cleanupError) {
        console.error('Failed to delete verification token after registration error', cleanupError);
      }
    }

    throw handlePrismaError(error);
  }
};

export const loginService = async (data) => {
  try {
    const user = await loginRepository({ email: data.email });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials', { code: 'AUTH_INVALID_CREDENTIALS' });
    }

    const isValid = await bcrypt.compare(data.password, user.password);

    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials', { code: 'AUTH_INVALID_CREDENTIALS' });
    }

    const primaryEmail = await findPrimaryUserEmailRepository(user.id);

    if (!primaryEmail || !primaryEmail.emailVerifiedAt) {
      throw new UnauthorizedError('Email not verified', { code: 'AUTH_EMAIL_NOT_VERIFIED' });
    }

    if (!process.env.JWT_SECRET) {
      throw new InternalServerError('JWT_SECRET is not defined');
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });

    const { password: _password, ...safeUser } = user;

    return { token, user: safeUser };
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const resendVerificationService = async (email) => {
  let verificationToken;

  try {
    const user = await loginRepository({ email });

    if (!user) {
      throw new NotFoundError('User not found', { code: 'AUTH_USER_NOT_FOUND' });
    }

    const primaryEmail = await findPrimaryUserEmailRepository(user.id);

    if (!primaryEmail) {
      throw new InternalServerError('Primary email record not found', { code: 'AUTH_PRIMARY_EMAIL_NOT_FOUND' });
    }

    if (primaryEmail.emailVerifiedAt) {
      throw new BadRequestError('Email already verified', { code: 'AUTH_EMAIL_ALREADY_VERIFIED' });
    }

    verificationToken = await createTokenService({
      userId: user.id,
      type: EmailVerificationTokenType.ACCOUNT_EMAIL,
    });

    await sendVerificationEmail({ to: user.email, token: verificationToken.token, type: EmailVerificationTokenType.ACCOUNT_EMAIL });

    return {
      userId: user.id,
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

export const verifyEmailService = async (tokenString) => {
  try {
    const token = await consumeTokenService(tokenString);
    const verifiedAt = new Date();

    const primaryEmail = await findPrimaryUserEmailRepository(token.userId);

    if (!primaryEmail) {
      throw new InternalServerError('Primary email record not found for user', { code: 'AUTH_PRIMARY_EMAIL_NOT_FOUND' });
    }

    const updatedPrimaryEmail = await updateUserEmailRepository(primaryEmail.id, {
        emailVerifiedAt: verifiedAt,
      });
    
    return {
      userId: updatedPrimaryEmail.userId,
      emailVerifiedAt: updatedPrimaryEmail.emailVerifiedAt,
      message: 'Email verified successfully.',
    };
  } catch (error) {
    throw handlePrismaError(error);
  }
};