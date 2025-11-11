import {
  createUserEmailService,
  resendUserEmailVerificationService,
  verifyUserEmailService,
  setPrimaryUserEmailService,
  deleteUserEmailService,
  getUserEmailsService,
} from '../services/userEmails.js';

export const createUserEmail = async (req, res, next) => {
  try {
    const { email } = req.validatedData.body;
    const result = await createUserEmailService({ userId: req.user.id, email });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyUserEmail = async (req, res, next) => {
  try {
    const { selector, token } = req.validatedData.body;
    const result = await verifyUserEmailService(selector, token);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const resendUserEmailVerification = async (req, res, next) => {
  try {
    const { id } = req.validatedData.params;
    const result = await resendUserEmailVerificationService({
      userId: req.user.id,
      userEmailId: id,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const setPrimaryUserEmail = async (req, res, next) => {
  try {
    const { id } = req.validatedData.params;
    const result = await setPrimaryUserEmailService({
      userId: req.user.id,
      userEmailId: id,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteUserEmail = async (req, res, next) => {
  try {
    const { id } = req.validatedData.params;
    const result = await deleteUserEmailService({
      userId: req.user.id,
      userEmailId: id,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const listUserEmails = async (req, res, next) => {
  try {
    const emails = await getUserEmailsService(req.user.id);
    res.status(200).json({ emails });
  } catch (error) {
    next(error);
  }
};