import { z } from 'zod';

// User registration
export const registerUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// User login
export const loginUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string(),
});

// User update (all fields optional)
export const updateUserSchema = registerUserSchema.partial();

// Form creation
export const createFormSchema = z.object({
  name: z.string().min(1, 'Form name is required'),
  destinationEmail: z.string().email('Invalid email format'),
});

// Form update (all fields optional)
export const updateFormSchema = createFormSchema.partial();

// External form submission payload
export const submissionSchema = z.object({
  data: z.record(z.string(), z.any()),
  token: z.string().uuid('Invalid form token'),
});