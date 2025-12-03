import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  registerUserSchema,
  loginUserSchema,
  resendVerificationSchema,
  verifyEmailSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  refreshTokenSchema,
  logoutSchema,
} from '../utils/validation/auth.js';
import {
  registerUser,
  loginUser,
  resendVerificationEmail,
  verifyEmail,
  requestPasswordReset,
  confirmPasswordReset,
  refreshAccessToken,
  logoutUser,
} from '../controllers/auth.js';

const router = express.Router();

router.post(
  '/register',
  validateRequest(registerUserSchema),
  registerUser
);

router.post(
  '/login',
  validateRequest(loginUserSchema),
  loginUser
);

router.post(
  '/resend-verification',
  validateRequest(resendVerificationSchema),
  resendVerificationEmail
);

router.get(
  '/verify-email',
  validateRequest(verifyEmailSchema, 'query'),
  verifyEmail
);

router.post(
  '/reset-password',
  validateRequest(passwordResetRequestSchema),
  requestPasswordReset
);

router.post(
  '/reset-password/confirm',
  validateRequest(passwordResetConfirmSchema),
  confirmPasswordReset
);

router.post(
  '/refresh',
  validateRequest(refreshTokenSchema),
  refreshAccessToken
);

router.post(
  '/logout',
  validateRequest(logoutSchema),
  logoutUser
);

export default router;