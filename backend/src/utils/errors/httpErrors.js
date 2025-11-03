export class HttpError extends Error {
  constructor(message = 'Unexpected error', status = 500, details) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad request', details) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', details) {
    super(message, 401, details);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', details) {
    super(message, 403, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found', details) {
    super(message, 404, details);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict', details) {
    super(message, 409, details);
  }
}

export class InternalServerError extends HttpError {
  constructor(message = 'Internal server error', details) {
    super(message, 500, details);
  }
}