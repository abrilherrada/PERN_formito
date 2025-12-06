import { verifyToken } from './verifyToken.js';

export const optionalVerifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    await verifyToken(req, res, next);
  } catch (error) {
    return next(error);
  }
};