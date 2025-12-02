const ensureDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildUTCDate = (year, month, day = 1) => {
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
};

export const calculateCurrentPeriodStart = (referenceDate = new Date()) => {
  const date = ensureDate(referenceDate) ?? new Date();
  return buildUTCDate(date.getUTCFullYear(), date.getUTCMonth());
};

export const calculateNextMonthlyReset = (referenceDate = new Date()) => {
  const date = ensureDate(referenceDate) ?? new Date();
  return buildUTCDate(date.getUTCFullYear(), date.getUTCMonth() + 1);
};

export const isResetDue = ({ nextResetAt, referenceDate = new Date() }) => {
  const target = ensureDate(nextResetAt);

  if (!target) {
    return true;
  }

  const now = ensureDate(referenceDate) ?? new Date();
  return now >= target;
};

export const normalizeUsagePeriod = ({ periodStart, referenceDate = new Date() } = {}) => {
  const start = ensureDate(periodStart) ?? calculateCurrentPeriodStart(referenceDate);
  return {
    start,
    next: calculateNextMonthlyReset(start),
  };
};