import { registerService, loginService } from '../services/auth.js';

export const registerUser = async (req, res) => {
  try {
    const user = await registerService(req.validatedData.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(error.status ?? 500).json({ error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { token, user } = await loginService(req.validatedData.body);
    res.status(200).header('Authorization', `Bearer ${token}`).json({token, user});
  } catch (error) {
    res.status(error.status ?? 500).json({ error: error.message });
  }
};