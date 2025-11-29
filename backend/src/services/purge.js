import { EntityStatus } from '@prisma/client';
import {
  findSoftDeletedUsersRepository,
  anonymizeUserRepository,
} from '../repositories/user.js';
import {
  findSoftDeletedFormsRepository,
  anonymizeFormRepository,
} from '../repositories/form.js';
import {
  findSoftDeletedSubmissionsRepository,
  anonymizeSubmissionRepository,
} from '../repositories/submission.js';
import { anonymizeUserEmailRepository } from '../repositories/userEmail.js';
import {
  deleteTokensByUserIdsRepository,
  deleteTokensByUserEmailIdRepository,
} from '../repositories/verificationToken.js';
import {
  getCutoffDate,
  buildAnonymizedEmail,
  buildSubmissionMetadata,
  shouldAnonymizeEntity,
} from '../utils/anonymizeData.js';

const DEFAULT_RETENTION_DAYS = Number(process.env.PURGE_RETENTION_DAYS ?? '30');

const buildSummary = () => ({
  usersAnonymized: 0,
  userEmailsAnonymized: 0,
  formsAnonymized: 0,
  submissionsAnonymized: 0,
  tokensDeleted: 0,
});

const anonymizeUserEmails = async (user, summary) => {
  if (!user.userEmails?.length) {
    return;
  }

  for (const userEmail of user.userEmails) {
    if (userEmail.purgedAt) {
      continue;
    }

    await anonymizeUserEmailRepository(userEmail.id, {
      email: buildAnonymizedEmail(userEmail.email),
      purgedAt: new Date()
    });

    const tokenDeletion = await deleteTokensByUserEmailIdRepository(userEmail.id);
    summary.tokensDeleted += tokenDeletion.count ?? 0;
    summary.userEmailsAnonymized += 1;
  }
};

const anonymizeSubmissions = async (submissions, cutoffDate, summary, { force = false } = {}) => {
  if (!submissions?.length) {
    return;
  }

  for (const submission of submissions) {
    if (submission.purgedAt) {
      continue;
    }

    const shouldProcess = force || shouldAnonymizeEntity(submission, cutoffDate);

    if (!shouldProcess) {
      continue;
    }

    const metadata = buildSubmissionMetadata(submission.data ?? {});
    const updatePayload = {
      data: {},
      metadata,
      purgedAt: new Date(),
    };

    if (force) {
      updatePayload.status = EntityStatus.DELETED;
      updatePayload.deletedAt = submission.deletedAt ?? new Date();
    }

    await anonymizeSubmissionRepository(submission.id, updatePayload);

    summary.submissionsAnonymized += 1;
  }
};

const anonymizeForms = async (forms, cutoffDate, summary, { force = false } = {}) => {
  if (!forms?.length) {
    return;
  }

  for (const form of forms) {
    if (form.purgedAt) {
      continue;
    }

    const shouldForce = force || shouldAnonymizeEntity(form, cutoffDate);

    await anonymizeSubmissions(form.submissions, cutoffDate, summary, {
      force: shouldForce,
    });

    if (!shouldForce) {
      continue;
    }

    const destinationEmail = form.destinationEmail
      ? buildAnonymizedEmail(form.destinationEmail)
      : null;

    const updatePayload = {
      name: 'Anonymized Form',
      destinationEmail,
      purgedAt: new Date(),
    };

    if (shouldForce || form.status !== EntityStatus.DELETED) {
      updatePayload.status = EntityStatus.DELETED;
      updatePayload.deletedAt = form.deletedAt ?? new Date();
    }

    await anonymizeFormRepository(form.id, updatePayload);

    summary.formsAnonymized += 1;
  }
};

const anonymizeUsers = async (users, cutoffDate, summary) => {
  if (!users?.length) {
    return;
  }

  for (const user of users) {
    if (!shouldAnonymizeEntity(user, cutoffDate)) {
      continue;
    }

    await anonymizeUserRepository(user.id, {
      name: 'Anonymized User',
      email: buildAnonymizedEmail(user.email),
      purgedAt: new Date(),
    });

    summary.usersAnonymized += 1;

    const tokenDeletion = await deleteTokensByUserIdsRepository([user.id]);
    summary.tokensDeleted += tokenDeletion.count ?? 0;

    await anonymizeUserEmails(user, summary);
    await anonymizeForms(user.forms, cutoffDate, summary, { force: true });
  }
};

export const purgeSoftDeletedEntitiesService = async ({
  retentionDays = DEFAULT_RETENTION_DAYS,
} = {}) => {
  const cutoffDate = getCutoffDate(retentionDays);
  const summary = buildSummary();

  const users = await findSoftDeletedUsersRepository(cutoffDate);
  await anonymizeUsers(users, cutoffDate, summary);

  const forms = await findSoftDeletedFormsRepository(cutoffDate);
  await anonymizeForms(forms, cutoffDate, summary);

  const standaloneSubmissions = await findSoftDeletedSubmissionsRepository(cutoffDate);
  await anonymizeSubmissions(standaloneSubmissions, cutoffDate, summary);

  return summary;
};