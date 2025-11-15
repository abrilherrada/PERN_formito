import { z } from 'zod';

const submissionValueSchema = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(submissionValueSchema),
    z.record(z.string(), submissionValueSchema)
  ])
);

export const submissionParamsSchema = z.object({
  formId: z.string().cuid('Invalid form ID')
});

export const submissionDetailParamsSchema = z.object({
  formId: z.string().cuid('Invalid form ID'),
  submissionId: z.string().cuid('Invalid submission ID')
});

export const submissionBodySchema = z.object({
  data: z.record(z.string(), submissionValueSchema)
});