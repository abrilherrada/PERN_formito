import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  registerUserSchema,
  loginUserSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from '../utils/validation/auth.js';
import {
  registerUser,
  loginUser,
  resendVerificationEmail,
  verifyEmail
} from '../controllers/auth.js';

const router = express.Router();

router.post('/register', validateRequest(registerUserSchema), registerUser);

router.post('/login', validateRequest(loginUserSchema), loginUser);

router.post('/resend-verification', validateRequest(resendVerificationSchema), resendVerificationEmail);

router.get('/verify-email', validateRequest(verifyEmailSchema, 'query'), verifyEmail);

export default router;