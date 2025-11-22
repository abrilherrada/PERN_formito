import {
  createSubmissionService,
  findSubmissionsByFormIdService,
  findSubmissionByIdService,
  deleteSubmissionService,
  restoreSubmissionService 
} from '../services/submissions.js';

export const createSubmission = async (req, res, next) => {
  try {
    const { formId } = req.validatedData.params;
    const { data } = req.validatedData.body;
    const result = await createSubmissionService({ formId, data });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const findSubmissionsByFormId = async (req, res, next) => {
  try {
    const { formId } = req.validatedData.params;
    const result = await findSubmissionsByFormIdService(formId, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const findSubmissionById = async (req, res, next) => {
  try {
    const { formId, submissionId } = req.validatedData.params;
    const result = await findSubmissionByIdService(submissionId, req.user.id, formId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.validatedData.params;
    const result = await deleteSubmissionService({
      id: submissionId,
      userId: req.user.id,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const restoreSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.validatedData.params;
    const result = await restoreSubmissionService({
      id: submissionId,
      userId: req.user.id,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};