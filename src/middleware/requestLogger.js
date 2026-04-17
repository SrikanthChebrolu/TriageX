export function requestLogger(req, _res, next) {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`${new Date().toISOString()}  ${req.method}  ${req.path}`);
  }
  next();
}
