import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createFormSchema,
  updateFormSchema,
  formIdSchema,
} from '../utils/validation/forms.js';
import {
  createForm,
  findFormById,
  findFormsByUserId,
  updateForm,
  deleteForm,
} from '../controllers/forms.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', validateRequest(createFormSchema), createForm);

router.get('/', findFormsByUserId);

router.get('/:id', validateRequest(formIdSchema, 'params'), findFormById);

router.patch('/:id', validateRequest(formIdSchema, 'params'), validateRequest(updateFormSchema), updateForm);

router.delete('/:id', validateRequest(formIdSchema, 'params'), deleteForm);

export default router;