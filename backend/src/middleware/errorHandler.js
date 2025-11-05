export const errorHandler = (err, req, res, next) => {
  const status = err.status ?? 500;

  const response = {
    message: err.message ?? 'Unexpected error',
  };

  const details = err.details ?? {};
  const { code, ...restDetails } = details;

  if (code) {
    response.code = code;
  }

  if (Object.keys(restDetails).length > 0) {
    response.details = restDetails;
  }

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  console.error(`[Error] ${req.method} ${req.originalUrl}`, {
    status,
    message: err.message,
    code,
    details: restDetails,
    stack: err.stack,
  });

  res.status(status).json(response);
};