import {
  findCurrentUserService,
  updateCurrentUserService,
  deleteCurrentUserService,
  getUsersService,
  getUserByIdService,
  updateUserByIdService,
  deleteUserByIdService,
  restoreUserByIdService
} from '../services/users.js';

export const findCurrentUser = async (req, res, next) => {
  try {
    const result = await findCurrentUserService(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateCurrentUser = async (req, res, next) => {
  try {
    const { name, newPrimaryEmail, currentPassword, newPassword } = req.validatedData.body;
    const result = await updateCurrentUserService(req.user.id, { name, newPrimaryEmail, currentPassword, newPassword });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteCurrentUser = async (req, res, next) => {
  try {
    const result = await deleteCurrentUserService(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { status, search, includeDeleted, take, skip } = req.validatedData.query;
    const result = await getUsersService({ status, search, includeDeleted, take, skip });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.validatedData.params;
    const result = await getUserByIdService(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateUserById = async (req, res, next) => {
  try {
    const { userId } = req.validatedData.params;
    const { name, role, status, plan, maxSubmissions } = req.validatedData.body;
    const result = await updateUserByIdService(userId, { name, role, status, plan, maxSubmissions });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteUserById = async (req, res, next) => {
  try {
    const { userId } = req.validatedData.params;
    const result = await deleteUserByIdService(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const restoreUserById = async (req, res, next) => {
  try {
    const { userId } = req.validatedData.params;
    const result = await restoreUserByIdService(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};