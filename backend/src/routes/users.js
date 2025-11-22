import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  userIdParamSchema,
  updateCurrentUserSchema,
  getUsersQuerySchema,
  updateUserByIdBodySchema,
} from '../utils/validation/users.js';
import {
  findCurrentUser,
  updateCurrentUser,
  deleteCurrentUser,
  getUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  restoreUserById,
} from '../controllers/users.js';

const router = express.Router();

router.use(verifyToken);

router.get(
  '/me',
  findCurrentUser
);

router.patch(
  '/me',
  validateRequest(updateCurrentUserSchema),
  updateCurrentUser
);

router.delete(
  '/me',
  deleteCurrentUser
);

// Admin routes
router.use(verifyAdmin);

router.get(
  '/',
  validateRequest(getUsersQuerySchema, 'query'),
  getUsers
);

router.get(
  '/:userId',
  validateRequest(userIdParamSchema, 'params'),
  getUserById
);

router.patch(
  '/:userId',
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(updateUserByIdBodySchema),
  updateUserById
);

router.delete(
  '/:userId',
  validateRequest(userIdParamSchema, 'params'),
  deleteUserById
);

router.patch(
  '/:userId/restore',
  validateRequest(userIdParamSchema, 'params'),
  restoreUserById
);

export default router;