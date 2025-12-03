import { z } from 'zod';

export const registerUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string(),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const verifyEmailSchema = z.object({
  selector: z.string().uuid('Invalid verification token selector'),
  token: z.string().uuid('Invalid verification token'),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const passwordResetConfirmSchema = z.object({
  selector: z.string().uuid('Invalid verification token selector'),
  token: z.string().uuid('Invalid verification token'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token cannot be empty').optional(),
}).strict();

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token cannot be empty').optional(),
  sessionTokenId: z.string().uuid('Invalid session token id').optional(),
}).strict().refine((data) => data.refreshToken || data.sessionTokenId, {
  message: 'Refresh token or session token id is required',
  path: ['refreshToken'],
});