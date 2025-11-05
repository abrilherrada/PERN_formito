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
  token: z.string().uuid('Invalid verification token'),
});