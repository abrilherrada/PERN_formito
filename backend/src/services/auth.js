import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  registerRepository,
  loginRepository
} from '../repositories/auth.js';
import {
  InternalServerError,
  UnauthorizedError,
} from '../utils/errors/httpErrors.js';
import { handlePrismaError } from '../utils/errors/prismaErrors.js';

export const registerService = async (data) => {
  try {
    const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await registerRepository({ ...data, password: hashedPassword });

    const { password: _password, ...safeUser } = user;

    return safeUser;
  } catch (error) {
    throw handlePrismaError(error);
  }
};

export const loginService = async (data) => {
  try {
  const user = await loginRepository({ email: data.email });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValid = await bcrypt.compare(data.password, user.password);

  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!process.env.JWT_SECRET) {
    throw new InternalServerError('JWT_SECRET is not defined');
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

  const { password: _password, ...safeUser } = user;

  return {token, user: safeUser};
  } catch (error) {
    throw handlePrismaError(error);
  }
};