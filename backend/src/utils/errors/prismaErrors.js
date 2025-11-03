import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, InternalServerError } from './httpErrors.js';

const prismaErrorMap = {
  P2002: ConflictError,
  P2025: NotFoundError,
};

const buildUniqueConstraintMessage = (target) => {
  if (!target || target.length === 0) {
    return 'Resource already exists';
  }

  return `${target.join(', ')} already exists`;
};

export const handlePrismaError = (error) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const ErrorClass = prismaErrorMap[error.code];

    if (ErrorClass) {
      let message = error.message;

      if (error.code === 'P2002') {
        message = buildUniqueConstraintMessage(error.meta?.target);
      } else if (error.meta?.target) {
        message = `${error.meta.target.join(', ')} caused an error`;
      }

      return new ErrorClass(message);
    }

    return new InternalServerError('Database error', error.meta);
  }

  return error;
};