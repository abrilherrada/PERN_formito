import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { optionalVerifyToken } from '../middleware/optionalVerifyToken.js';
import {
  loginIpLimiter,
  loginAccountLimiter,
  registerIpLimiter,
  passwordResetIpLimiter,
  passwordResetEmailLimiter,
  resendVerificationIpLimiter,
  resendVerificationEmailHourlyLimiter,
  resendVerificationEmailCooldownLimiter,
  refreshTokenLimiter,
  logoutLimiter,
} from '../middleware/rateLimiters.js';
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
  registerIpLimiter,
  validateRequest(registerUserSchema),
  registerUser
);

router.post(
  '/login',
  validateRequest(loginUserSchema),
  loginAccountLimiter,
  loginIpLimiter,
  loginUser
);

router.post(
  '/resend-verification',
  validateRequest(resendVerificationSchema),
  resendVerificationEmailCooldownLimiter,
  resendVerificationEmailHourlyLimiter,
  resendVerificationIpLimiter,
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
  passwordResetEmailLimiter,
  passwordResetIpLimiter,
  requestPasswordReset
);

router.post(
  '/reset-password/confirm',
  validateRequest(passwordResetConfirmSchema),
  confirmPasswordReset
);

router.post(
  '/refresh',
  refreshTokenLimiter,
  validateRequest(refreshTokenSchema),
  refreshAccessToken
);

router.post(
  '/logout',
  optionalVerifyToken,
  validateRequest(logoutSchema),
  logoutLimiter,
  logoutUser
);

export default router;