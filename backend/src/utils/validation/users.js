import { z } from 'zod';
import { EntityStatus, UserRole } from '@prisma/client';

export const userIdParamSchema = z.object({
  userId: z.string().cuid('Invalid user ID')
});

export const updateCurrentUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .optional(),
    newPrimaryEmail: z
      .string()
      .trim()
      .email('Invalid email format')
      .optional(),
    currentPassword: z
      .string()
      .min(8, 'Current password must be at least 8 characters long')
      .optional(),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    {
      message: 'At least one field must be provided',
      path: ['name'],
    }
  )
  .refine(
    (data) => !(data.newPassword && !data.currentPassword),
    {
      message: 'Current password is required to update the password',
      path: ['currentPassword'],
    }
  )
  .refine(
    (data) => !(data.newPrimaryEmail && !data.currentPassword),
    {
      message: 'Current password is required to update the email',
      path: ['currentPassword'],
    }
  );

  export const getUsersQuerySchema = z.object({
    status: z.nativeEnum(EntityStatus).optional(),
    role: z.nativeEnum(UserRole).optional(),
    search: z
      .string()
      .trim()
      .min(1, 'Search must contain at least 1 character')
      .optional(),
    includeDeleted: z.coerce.boolean().optional(),
    take: z.coerce.number().int().positive().max(100).optional(),
    skip: z.coerce.number().int().nonnegative().optional(),
  });

  export const updateUserByIdBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .optional(),
    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(EntityStatus).optional(),
    plan: z
      .string()
      .trim()
      .min(1, 'Plan is required')
      .optional(),
    maxSubmissions: z.coerce
      .number()
      .int()
      .min(0, 'Max submissions must be 0 or greater')
      .optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    {
      message: 'At least one field must be provided',
      path: ['name'],
    }
  );