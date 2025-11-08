import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createUserEmailSchema,
  resendUserEmailSchema,
  verifyUserEmailSchema,
  setPrimaryUserEmailSchema,
  deleteUserEmailSchema,
} from '../utils/validation/userEmails.js';
import {
  createUserEmail,
  verifyUserEmail,
  resendUserEmailVerification,
  setPrimaryUserEmail,
  deleteUserEmail,
  listUserEmails,
} from '../controllers/userEmails.js';

const router = express.Router();

// Public route
router.post('/verify', validateRequest(verifyUserEmailSchema), verifyUserEmail);

// Private routes
router.use(verifyToken);

router.get('/', listUserEmails);

router.post('/', validateRequest(createUserEmailSchema), createUserEmail);

router.post('/:id/resend', validateRequest(resendUserEmailSchema, 'params'), resendUserEmailVerification);

router.patch('/:id/primary', validateRequest(setPrimaryUserEmailSchema, 'params'), setPrimaryUserEmail);

router.delete('/:id', validateRequest(deleteUserEmailSchema, 'params'), deleteUserEmail);

export default router;