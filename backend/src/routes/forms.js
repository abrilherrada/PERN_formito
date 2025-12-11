import express from 'express';
import multer from 'multer';
import { normalizeSubmission } from '../middleware/normalizeSubmission.js';
import {
  submissionPerFormLimiter,
  submissionGlobalIpLimiter,
} from '../middleware/rateLimiters.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createFormSchema,
  updateFormSchema,
  formIdSchema,
} from '../utils/validation/forms.js';
import {
  submissionParamsSchema,
  submissionDetailParamsSchema,
  submissionBodySchema
} from '../utils/validation/submissions.js';
import {
  createForm,
  findFormById,
  findFormsByUserId,
  updateForm,
  deleteForm,
  suspendForm,
  restoreForm
} from '../controllers/forms.js';
import {
  createSubmission,
  findSubmissionsByFormId,
  findSubmissionById,
  deleteSubmission,
  restoreSubmission
} from '../controllers/submissions.js';

const router = express.Router();
const parseMultipart = multer().none();

// Public
router.post(
  '/:formId',
  submissionGlobalIpLimiter,
  submissionPerFormLimiter,
  parseMultipart,
  normalizeSubmission,
  validateRequest(submissionParamsSchema, 'params'),
  validateRequest(submissionBodySchema),
  createSubmission
);

// Private
router.use(verifyToken);

router.post(
  '/',
  validateRequest(createFormSchema),
  createForm
);

router.get(
  '/',
  findFormsByUserId
);

router.get(
  '/:formId',
  validateRequest(formIdSchema, 'params'),
  findFormById
);

router.patch(
  '/:formId',
  validateRequest(formIdSchema, 'params'),
  validateRequest(updateFormSchema),
  updateForm
);

router.delete(
  '/:formId',
  validateRequest(formIdSchema, 'params'),
  deleteForm
);

router.patch(
  '/:formId/suspend',
  validateRequest(formIdSchema, 'params'),
  verifyAdmin,
  suspendForm
);

router.patch(
  '/:formId/restore',
  validateRequest(formIdSchema, 'params'),
  verifyAdmin,
  restoreForm
);

router.get(
  '/:formId/submissions',
  validateRequest(submissionParamsSchema, 'params'),
  findSubmissionsByFormId
);

router.get(
  '/:formId/submissions/:submissionId',
  validateRequest(submissionDetailParamsSchema, 'params'),
  findSubmissionById
);

router.delete(
  '/:formId/submissions/:submissionId',
  validateRequest(submissionDetailParamsSchema, 'params'),
  deleteSubmission
);

router.patch(
  '/:formId/submissions/:submissionId/restore',
  validateRequest(submissionDetailParamsSchema, 'params'),
  restoreSubmission
);

export default router;