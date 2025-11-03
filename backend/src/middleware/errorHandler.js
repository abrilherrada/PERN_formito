export const errorHandler = (err, req, res, next) => {
  const status = err.status ?? 500;

  const response = {
    message: err.message ?? 'Unexpected error',
  };

  if (err.details) {
    response.details = err.details;
  }

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  console.error(`[Error] ${req.method} ${req.originalUrl}`, {
    status,
    message: err.message,
    details: err.details,
    stack: err.stack,
  });

  res.status(status).json(response);
};