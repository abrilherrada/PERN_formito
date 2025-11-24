import { toOrderedEntries } from '../utils/processSubmission.js';
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

  const data = payload && typeof payload === 'object' ? payload.data ?? payload : payload;

  req.body = {
    data: toOrderedEntries(data),
  };

  return next();
};