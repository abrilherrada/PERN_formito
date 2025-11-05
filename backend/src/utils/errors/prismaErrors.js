import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, InternalServerError } from './httpErrors.js';

const prismaErrorMap = {
  P2002: {
    ErrorClass: ConflictError,
    code: 'CONFLICT_UNIQUE_CONSTRAINT',
  },
  P2025: {
    ErrorClass: NotFoundError,
    code: 'NOT_FOUND',
  },
};

const buildUniqueConstraintMessage = (target) => {
  if (!target || target.length === 0) {
    return 'Resource already exists';
  }

  return `${target.join(', ')} already exists`;
};

export const handlePrismaError = (error) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapping = prismaErrorMap[error.code];

    if (mapping) {
      const { ErrorClass, code } = mapping;

      let message = error.message;
      let details = error.meta ?? {};

      if (code) {
        details = { ...details, code };
      }

      if (error.code === 'P2002') {
        message = buildUniqueConstraintMessage(error.meta?.target);
      } else if (error.meta?.target) {
        message = `${error.meta.target.join(', ')} caused an error`;
      }

      return new ErrorClass(message, details);
    }

    return new InternalServerError('Database error', {
      code: 'DATABASE_KNOWN_ERROR',
      meta: error.meta,
    });
  }

  return error;
};