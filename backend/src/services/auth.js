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
  findPrimaryUserEmailRepository
} from '../repositories/userEmail.js';
import {
  createSessionToken,
  rotateSessionToken,
  revokeSessionToken,
  revokeSessionByRefreshToken,
  revokeAllTokensForUser,
} from './sessionTokens.js';
import {
  updateUserRepository,
  findUserByEmailRepository,
  findUserByIdRepository
} from '../repositories/user.js';
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
  deleteTokensByUserIdService
} from './verificationTokens.js';
import { sendVerificationEmail } from './email/sendVerificationEmail.js';
import { VerificationTokenType } from '@prisma/client';
import { EntityStatus } from '@prisma/client';
import { sanitizeUser } from '../utils/sanitizeUser.js';

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
      type: VerificationTokenType.ACCOUNT_EMAIL,
    });

    await sendVerificationEmail({
      to: user.email,
      selector: verificationToken.selector,
      token: verificationToken.token,
      type: VerificationTokenType.ACCOUNT_EMAIL
    });

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

const createAccessToken = (account) => {
  if (!process.env.JWT_SECRET) {
    throw new InternalServerError('JWT_SECRET is not defined');
  }

  const tokenPayload = { id: account.id, role: account.role, status: account.status };

  return jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

export const loginService = async ({ email, password }, { userAgent = null, ipAddress = null } = {}) => {
  try {
    const account = await loginRepository(email, { includeDeleted: true });

    if (!account) {
      throw new UnauthorizedError('Invalid credentials', { code: 'AUTH_INVALID_CREDENTIALS' });
    }

    if (account.status === EntityStatus.DELETED) {
      throw new UnauthorizedError('Account deleted', { code: 'AUTH_ACCOUNT_DELETED' });
    }

    if (account.status === EntityStatus.SUSPENDED) {
      throw new UnauthorizedError('Account suspended', { code: 'AUTH_ACCOUNT_SUSPENDED' });
    }

    const isValid = await bcrypt.compare(password, account.password);

    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials', { code: 'AUTH_INVALID_CREDENTIALS' });
    }

    const primaryEmail = account.userEmails?.[0];

    if (!primaryEmail || !primaryEmail.emailVerifiedAt) {
      throw new UnauthorizedError('Email not verified', { code: 'AUTH_EMAIL_NOT_VERIFIED' });
    }

    const accessToken = createAccessToken(account);

    const { token: refreshToken } = await createSessionToken(account.id, {
      userAgent,
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      user: sanitizeUser(account),
    };
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const resendVerificationService = async (email) => {
  let verificationToken;

  try {
    const account = await findUserByEmailRepository(email, { includeDeleted: true });

    if (!account || account.status === EntityStatus.DELETED) {
      throw new NotFoundError('User not found', { code: 'AUTH_USER_NOT_FOUND' });
    }

    if (account.status === EntityStatus.SUSPENDED) {
      throw new BadRequestError('Account suspended', { code: 'AUTH_ACCOUNT_SUSPENDED' });
    }

    const primaryEmail = await findPrimaryUserEmailRepository(account.id);

    if (!primaryEmail) {
      throw new InternalServerError('Primary email record not found', { code: 'AUTH_PRIMARY_EMAIL_NOT_FOUND' });
    }

    if (primaryEmail.emailVerifiedAt) {
      throw new BadRequestError('Email already verified', { code: 'AUTH_EMAIL_ALREADY_VERIFIED' });
    }

    verificationToken = await createTokenService({
      userId: account.id,
      type: VerificationTokenType.ACCOUNT_EMAIL,
    });

    await sendVerificationEmail({
      to: account.email,
      selector: verificationToken.selector,
      token: verificationToken.token,
      type: VerificationTokenType.ACCOUNT_EMAIL
    });

    return {
      userId: account.id,
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

export const verifyEmailService = async (tokenSelector, tokenValue) => {
  try {
    const token = await consumeTokenService(tokenSelector, tokenValue, VerificationTokenType.ACCOUNT_EMAIL);
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

export const requestPasswordResetService = async (email) => {
  try {
    const account = await findUserByEmailRepository(email, { includeDeleted: true });

    if (!account) {
      return {
        message: 'If that email exists in our system, we have sent a link to reset the password.',
      };
    }

    if (account.status === EntityStatus.DELETED) {
      throw new NotFoundError('User not found', { code: 'AUTH_USER_NOT_FOUND' });
    }

    if (account.status === EntityStatus.SUSPENDED) {
      throw new BadRequestError('Account suspended', { code: 'AUTH_ACCOUNT_SUSPENDED' });
    }

    const primaryEmail = await findPrimaryUserEmailRepository(account.id);

    if (!primaryEmail || !primaryEmail.emailVerifiedAt) {
      return {
        message: 'If that email exists in our system, we have sent a link to reset the password.',
      };
    }

    const resetToken = await createTokenService({
      userId: account.id,
      type: VerificationTokenType.PASSWORD_RESET,
    });

    await sendVerificationEmail({
      to: primaryEmail.email,
      selector: resetToken.selector,
      token: resetToken.token,
      type: VerificationTokenType.PASSWORD_RESET
    });

    return {
      message: 'If that email exists in our system, we have sent a link to reset the password.'
    };
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const resetPasswordService = async (selector, tokenValue, newPassword) => {
  try {
    const token = await consumeTokenService(selector, tokenValue, VerificationTokenType.PASSWORD_RESET);

    const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await updateUserRepository(token.userId, {
      password: hashedPassword,
    });

    await deleteTokensByUserIdService(token.userId, VerificationTokenType.PASSWORD_RESET);
    await revokeAllTokensForUser(token.userId, { reason: 'USER_PASSWORD_RESET' });

    return {
      userId: token.userId,
      message: 'Password reset successfully.',
    };
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const refreshAccessTokenService = async (
  refreshToken,
  { userAgent = null, ipAddress = null } = {}
) => {
  try {
    const { token: newRefreshToken, sessionToken: newSession } = await rotateSessionToken(refreshToken, {
      userAgent,
      ipAddress,
    });

    const account = await findUserByIdRepository(newSession.userId, { includeDeleted: true });

    if (!account) {
      throw new UnauthorizedError('Invalid session', { code: 'AUTH_SESSION_USER_NOT_FOUND' });
    }

    if (account.status === EntityStatus.DELETED) {
      throw new UnauthorizedError('Account deleted', { code: 'AUTH_ACCOUNT_DELETED' });
    }

    if (account.status === EntityStatus.SUSPENDED) {
      throw new UnauthorizedError('Account suspended', { code: 'AUTH_ACCOUNT_SUSPENDED' });
    }

    const primaryEmail = await findPrimaryUserEmailRepository(account.id);

    if (!primaryEmail || !primaryEmail.emailVerifiedAt) {
      throw new UnauthorizedError('Email not verified', { code: 'AUTH_EMAIL_NOT_VERIFIED' });
    }

    const accessToken = createAccessToken(account);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: sanitizeUser(account),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
      throw error;
    }

    throw handlePrismaError(error);
  }
};

export const logoutService = async ({ refreshToken, sessionTokenId } = {}) => {
  if (!refreshToken && !sessionTokenId) {
    throw new BadRequestError('Refresh token or session token id is required', {
      code: 'SESSION_IDENTIFIER_REQUIRED',
    });
  }

  try {
    const reason = 'LOGOUT';

    if (refreshToken) {
      const revoked = await revokeSessionByRefreshToken(refreshToken, { reason });
      return { sessionTokenId: revoked.id, revoked: true };
    }

    const revoked = await revokeSessionToken(sessionTokenId, { reason });
    return { sessionTokenId: revoked.id, revoked: true };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
      throw error;
    }

    throw handlePrismaError(error);
  }
};