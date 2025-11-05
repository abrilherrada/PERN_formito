import { z } from 'zod';

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