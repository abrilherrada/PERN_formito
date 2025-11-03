export const validateRequest = (schema, location = 'body') => {
  return (req, res, next) => {
    const data = req[location];
    const result = schema.safeParse(data);

    if (!result.success) {
      const zodIssues = result.error.issues ?? result.error.errors ?? [];
      const errors = zodIssues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
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