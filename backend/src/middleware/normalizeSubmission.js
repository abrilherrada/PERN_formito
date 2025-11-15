import { BadRequestError } from '../utils/errors/httpErrors.js';

export const normalizeSubmission = (req, res, next) => {
  let payload = req.body;

  if (payload == null || typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return next(new BadRequestError('Request body must be JSON or form data', { code: 'INVALID_FORM_DATA' }));
    }
  }

  if (payload.data && typeof payload.data === 'object') {
    req.body = { data: payload.data };
  } else {
    req.body = { data: payload };
  }

  return next();
};