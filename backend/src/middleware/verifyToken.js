import jwt from 'jsonwebtoken';
import {
  UnauthorizedError,
  ForbiddenError,
  InternalServerError
} from '../utils/errors/httpErrors.js';
import { EntityStatus } from '@prisma/client';
import { findUserByIdRepository } from '../repositories/user.js';

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Unauthorized', { code: 'NO_AUTH_HEADER' });
  }

  const token = authHeader.split(' ')[1];

  if (!process.env.JWT_SECRET) {
    throw new InternalServerError('Server configuration error', { code: 'SERVER_CONFIG_ERROR' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload?.id) {
      throw new UnauthorizedError('Invalid token payload', { code: 'INVALID_TOKEN_PAYLOAD' });
    }

    const user = await findUserByIdRepository(payload.id, { includeDeleted: true });

    if (!user || user.status === EntityStatus.DELETED) {
      throw new UnauthorizedError('Account not available', { code: 'ACCOUNT_NOT_AVAILABLE' });
    }

    if (user.status === EntityStatus.SUSPENDED) {
      throw new ForbiddenError('Account suspended', { code: 'ACCOUNT_SUSPENDED' });
    }

    req.user = {
      id: user.id,
      role: user.role,
      status: user.status,
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired', { code: 'TOKEN_EXPIRED' });
    }

    throw new UnauthorizedError('Invalid token', { code: 'INVALID_TOKEN' });
  }
};