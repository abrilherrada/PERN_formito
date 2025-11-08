import { z } from 'zod';

export const createUserEmailSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const resendUserEmailSchema = z.object({
  id: z.string().cuid('Invalid user email id'),
});

export const verifyUserEmailSchema = z.object({
  token: z.string().uuid('Invalid verification token'),
});

export const setPrimaryUserEmailSchema = z.object({
  id: z.string().cuid('Invalid user email id'),
});

export const deleteUserEmailSchema = z.object({
  id: z.string().cuid('Invalid user email id'),
});