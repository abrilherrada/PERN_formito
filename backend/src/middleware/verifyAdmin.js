import { UserRole } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../utils/errors/httpErrors.js';

export const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Unauthorized', { code: 'NO_USER' });
  }

  if (req.user.role !== UserRole.ADMIN) {
    throw new ForbiddenError('Forbidden', { code: 'NOT_ADMIN' });
  }

  return next();
};