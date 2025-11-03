import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { registerRepository, loginRepository } from '../repositories/auth.js';

export const registerService = async (data) => {
  const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await registerRepository({ ...data, password: hashedPassword });

  const { password: _password, ...safeUser } = user;

  return safeUser;
};

export const loginService = async (data) => {
  const user = await loginRepository({ email: data.email });

  if (!user) {
    const error = new Error('Credenciales inválidas');
    error.status = 401;
    throw error;
  }

  const isValid = await bcrypt.compare(data.password, user.password);

  if (!isValid) {
    const error = new Error('Credenciales inválidas');
    error.status = 401;
    throw error;
  }

  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is not defined');
    error.status = 500;
    throw error;
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

  const { password: _password, ...safeUser } = user;

  return {token, user: safeUser};
};