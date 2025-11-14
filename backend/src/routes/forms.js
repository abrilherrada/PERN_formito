import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
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
} from '../controllers/forms.js';
import {
  createSubmission,
  findSubmissionsByFormId,
  findSubmissionById,
} from '../controllers/submissions.js';

const router = express.Router();

// Public
router.post('/:formId', validateRequest(submissionParamsSchema, 'params'), validateRequest(submissionBodySchema), createSubmission);

// Private
router.use(verifyToken);

router.post('/', validateRequest(createFormSchema), createForm);

router.get('/', findFormsByUserId);

router.get('/:formId', validateRequest(formIdSchema, 'params'), findFormById);

router.patch('/:formId', validateRequest(formIdSchema, 'params'), validateRequest(updateFormSchema), updateForm);

router.delete('/:formId', validateRequest(formIdSchema, 'params'), deleteForm);

router.get('/:formId/submissions', validateRequest(submissionParamsSchema, 'params'), findSubmissionsByFormId);

router.get('/:formId/submissions/:submissionId', validateRequest(submissionDetailParamsSchema, 'params'), findSubmissionById);

export default router;