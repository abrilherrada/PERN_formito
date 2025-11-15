import { z } from 'zod';

export const createFormSchema = z.object({
  name: z.string().min(1, 'Form name is required'),
  destinationEmail: z.string().email('Invalid email format'),
});

export const updateFormSchema = createFormSchema.partial();

export const formIdSchema = z.object({
  formId: z.string().cuid('Invalid form ID'),
});