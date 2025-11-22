import jwt from 'jsonwebtoken';
import { EntityStatus } from '@prisma/client';
import { findUserByIdRepository } from '../repositories/user.js';

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload?.id) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const user = await findUserByIdRepository(payload.id, { includeDeleted: true });

    if (!user || user.status === EntityStatus.DELETED) {
      return res.status(401).json({ error: 'Account not available' });
    }

    if (user.status === EntityStatus.SUSPENDED) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    req.user = {
      id: user.id,
      role: user.role,
      status: user.status,
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }

    return res.status(401).json({ error: 'Invalid token' });
  }
};