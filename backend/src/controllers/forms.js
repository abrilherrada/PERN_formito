import {
  createFormService,
  findFormByIdService,
  findFormsByUserIdService,
  updateFormService,
  deleteFormService,
} from '../services/forms.js';

export const createForm = async (req, res, next) => {
  try {
    const { name, destinationEmail } = req.validatedData.body;
    const result = await createFormService({ name, destinationEmail, userId: req.user.id });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const findFormById = async (req, res, next) => {
  try {
    const { id } = req.validatedData.params;
    const result = await findFormByIdService(id, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const findFormsByUserId = async (req, res, next) => {
  try {
    const result = await findFormsByUserIdService(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateForm = async (req, res, next) => {
  try {
    const { id } = req.validatedData.params;
    const { name, destinationEmail } = req.validatedData.body;
    const result = await updateFormService(id, { name, destinationEmail }, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteForm = async (req, res, next) => {
  try {
    const { id } = req.validatedData.params;
    await deleteFormService(id, req.user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};