import { z } from 'zod';

// External form submission payload
export const submissionSchema = z.object({
  data: z.record(z.string(), z.any()),
  token: z.string().uuid('Invalid form token'),
});