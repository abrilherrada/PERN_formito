import {
  registerService,
  loginService,
  resendVerificationService,
  verifyEmailService,
  requestPasswordResetService,
  resetPasswordService
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
    const { selector, token } = req.validatedData.query;
    const result = await verifyEmailService(selector, token);
    res
      .status(200)
      .json(result);
  } catch (error) {
    next(error);
  }
};

export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.validatedData.body;
    const result = await requestPasswordResetService(email);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const confirmPasswordReset = async (req, res, next) => {
  try {
    const { selector, token, newPassword } = req.validatedData.body;
    const result = await resetPasswordService(selector, token, newPassword);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};