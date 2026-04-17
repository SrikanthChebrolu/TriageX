export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status ?? 500;
  if (process.env.NODE_ENV !== 'production') console.error(err.stack ?? err.message);
  res.status(status).json({ data: null, error: err.message ?? 'Internal server error', meta: null });
}
