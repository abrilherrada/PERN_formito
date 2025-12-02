import { prisma } from '../../prisma/client.js';
import { EntityStatus, Plan } from '@prisma/client';
import { findUsersDueForSubmissionResetRepository } from '../repositories/user.js';
import {
  calculateNextMonthlyReset,
  isResetDue,
  normalizeUsagePeriod,
} from '../utils/computeSubmissionPeriod.js';

const DEFAULT_TRIGGERED_BY = 'system';

const buildResetSummary = () => ({
  total: 0,
  due: 0,
  attempted: 0,
  processed: 0,
  skipped: 0,
  failed: 0,
  details: [],
});

const appendDetail = (summary, detail) => {
  summary.details.push(detail);
};

const registerAttempt = (summary) => {
  summary.attempted += 1;
};

const markProcessed = (summary, userId) => {
  registerAttempt(summary);
  summary.processed += 1;
  appendDetail(summary, { userId, status: 'processed' });
};

const markSkipped = (summary, userId, reason) => {
  registerAttempt(summary);
  summary.skipped += 1;
  appendDetail(summary, { userId, status: 'skipped', reason });
};

const markFailed = (summary, userId, error) => {
  registerAttempt(summary);
  summary.failed += 1;
  appendDetail(summary, {
    userId,
    status: 'failed',
    reason: error?.message ?? 'Unknown error',
  });
};

const buildResetRecordPayload = (user, { periodStart, periodEnd, triggeredBy }) => ({
  periodStart,
  periodEnd,
  submissionsCount: user.currentSubmissions,
  maxSubmissions: user.maxSubmissions,
  plan: user.plan ?? Plan.FREE,
  triggeredBy,
});

const shouldSkipUser = (user, referenceDate) => {
  if (!user) {
    return true;
  }

  if (user.status === EntityStatus.DELETED || user.deletedAt) {
    return true;
  }

  if (user.currentSubmissions <= 0) {
    return !isResetDue({ nextResetAt: user.nextSubmissionResetAt, referenceDate });
  }

  return false;
};

const resetUserUsage = async (user, { triggeredBy, referenceDate }, summary, client) => {
  if (shouldSkipUser(user, referenceDate)) {
    markSkipped(summary, user.id, 'Already reset for current period');
    return;
  }

  const { start: periodStart, next: periodEnd } = normalizeUsagePeriod({referenceDate});

  const resetRecordPayload = buildResetRecordPayload(user, {
    periodStart,
    periodEnd,
    triggeredBy,
  });

  await client.user.update({
    where: { id: user.id },
    data: {
      currentSubmissions: 0,
      lastSubmissionResetAt: referenceDate,
      nextSubmissionResetAt: periodEnd,
      submissionUsageResets: {
        create: resetRecordPayload,
      },
    },
  });

  markProcessed(summary, user.id);
};

export const resetMonthlySubmissionUsageService = async ({
  referenceDate = new Date(),
  triggeredBy = DEFAULT_TRIGGERED_BY,
} = {}) => {
  const summary = buildResetSummary();

  const eligibleWhere = {
    deletedAt: null,
    status: {
      in: [EntityStatus.ACTIVE, EntityStatus.SUSPENDED],
    },
  };

  summary.total = await prisma.user.count({ where: eligibleWhere });

  const dueUsers = await findUsersDueForSubmissionResetRepository(referenceDate);
  summary.due = dueUsers.length;

  if (!dueUsers.length) {
    return summary;
  }

  await prisma.$transaction(async (tx) => {
    for (const user of dueUsers) {
      try {
        await resetUserUsage(user, { triggeredBy, referenceDate }, summary, tx);
      } catch (error) {
        markFailed(summary, user.id, error);
      }
    }
  });

  return summary;
};

export const resetSingleUserSubmissionUsageService = async (
  userId,
  { triggeredBy = DEFAULT_TRIGGERED_BY, referenceDate = new Date() } = {},
) => {
  const summary = buildResetSummary();

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    markSkipped(summary, userId, 'User not found');
    return summary;
  }

  summary.total = 1;
  summary.due = 1;

  await prisma.$transaction(async (tx) => {
    try {
      await resetUserUsage(user, { triggeredBy, referenceDate }, summary, tx);
    } catch (error) {
      markFailed(summary, userId, error);
    }
  });

  return summary;
};
