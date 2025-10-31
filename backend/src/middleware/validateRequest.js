export const validateRequest = (schema, location = 'body') => {
  return (req, res, next) => {
    const data = req[location];
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map((error) => ({
        field: error.path.join('.'),
        message: error.message,
      }));

      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    req.validatedData = {
      ...(req.validatedData ?? {}),
      [location]: result.data,
    };

    return next();
  };
};