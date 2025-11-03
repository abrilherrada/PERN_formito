import express from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { registerUserSchema, loginUserSchema } from '../utils/validation/index.js';
import { registerUser, loginUser } from '../controllers/auth.js';

const router = express.Router();

router.post('/register', validateRequest(registerUserSchema), registerUser);

router.post('/login', validateRequest(loginUserSchema), loginUser);

export default router;