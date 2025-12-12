import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters long')
  .superRefine((value, ctx) => {
    if (!/[a-z]/.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must include at least one lowercase letter',
      });
    }

    if (!/[A-Z]/.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must include at least one uppercase letter',
      });
    }

    if (!/\d/.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must include at least one number',
      });
    }

    if (!/[\p{P}\p{S}]/u.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must include at least one special character',
      });
    }
  });

export const registerUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
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
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token cannot be empty').optional(),
}).strict();

export const logoutSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token cannot be empty').optional(),
    sessionTokenId: z.string().cuid('Invalid session token id').optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.refreshToken && !data.sessionTokenId && Object.keys(data).length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Refresh token or session token id is required',
        path: ['refreshToken'],
      });
    }
  });