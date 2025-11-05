import {
  registerService,
  loginService,
  resendVerificationService,
  verifyEmailService
} from '../services/auth.js';

export const registerUser = async (req, res, next) => {
  try {
    const result = await registerService(req.validatedData.body);
    res
      .status(201)
      .json(result);
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { token, user } = await loginService(req.validatedData.body);
    res
      .status(200)
      .header('Authorization', `Bearer ${token}`)
      .json({ token, user });
  } catch (error) {
    next(error);
  }
};

export const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.validatedData.body;
    const result = await resendVerificationService(email);
    res
      .status(200)
      .json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.validatedData.query;
    const result = await verifyEmailService(token);
    res
      .status(200)
      .json(result);
  } catch (error) {
    next(error);
  }
};