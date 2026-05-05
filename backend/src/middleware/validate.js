const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    return res.status(400).json({
      message: 'Datos inválidos.',
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (result.data.body !== undefined) {
    req.body = result.data.body;
  }

  if (result.data.params !== undefined) {
    req.params = result.data.params;
  }

  if (result.data.query !== undefined) {
    req.query = result.data.query;
  }

  next();
};

module.exports = validate;
