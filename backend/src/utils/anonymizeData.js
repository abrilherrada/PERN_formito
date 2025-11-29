import crypto from 'crypto';
import { EntityStatus } from '@prisma/client';

const HASH_SALT = process.env.PURGE_HASH_SALT;
const PLACEHOLDER_DOMAIN = process.env.PURGE_PLACEHOLDER_DOMAIN;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const getCutoffDate = (retentionDays, referenceDate = new Date()) => {
  return new Date(referenceDate.getTime() - retentionDays * ONE_DAY_MS);
};

export const hashString = (value) => {
  return crypto.createHash('sha256').update(`${value}|${HASH_SALT}`).digest('hex');
};

export const buildAnonymizedEmail = (email) => {
  const normalized = (email ?? '').toLowerCase().trim();
  const source = normalized || crypto.randomUUID();
  const hash = hashString(source);

  return `anon-${hash}@${PLACEHOLDER_DOMAIN}`;
};

const isFileLike = (value) => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (value.isFile === true) {
    return true;
  }

  const fileIndicators = ['filename', 'originalName', 'mimeType', 'mimetype'];
  return fileIndicators.some((indicator) => typeof value[indicator] === 'string');
};

export const buildSubmissionMetadata = (data) => {
  if (!data || typeof data !== 'object') {
    return {
      fieldCount: 0,
      payloadSize: 0,
      keysHash: null,
      containsFile: false,
    };
  }

  let payloadSize = 0;

  try {
    payloadSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
  } catch (error) {
    payloadSize = 0;
  }

  const values = Object.values(data ?? {});
  const keys = Object.keys(data ?? {});
  const containsFile = values.some((value) => isFileLike(value));

  return {
    fieldCount: keys.length,
    payloadSize,
    keysHash: keys.length ? hashString(keys.sort().join('|')) : null,
    containsFile,
  };
};

export const shouldAnonymizeEntity = (entity, cutoffDate) => {
  if (!entity.deletedAt || entity.purgedAt) {
    return false;
  }

  return entity.status === EntityStatus.DELETED && entity.deletedAt < cutoffDate;
};
