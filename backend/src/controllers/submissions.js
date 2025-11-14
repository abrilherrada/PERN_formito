import {
  createSubmissionService,
  findSubmissionsByFormIdService,
  findSubmissionByIdService,
} from '../services/submissions.js';

export const createSubmission = async (req, res, next) => {
  try {
    const { formId } = req.validatedData.params;
    const result = await createSubmissionService({ formId, data: req.validatedData.body });
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
