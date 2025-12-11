import rateLimit from 'express-rate-limit';

const DEFAULT_MESSAGE = 'Too many requests. Please try again later.';
const RATE_LIMIT_CODE = 'RATE_LIMIT_EXCEEDED';

const toRetryAfterSeconds = (req) => {
  const resetTime = req.rateLimit?.resetTime;

  if (!resetTime) {
    return undefined;
  }

  const diff = resetTime.getTime() - Date.now();

  if (Number.isNaN(diff) || diff <= 0) {
    return undefined;
  }

  return Math.ceil(diff / 1000);
};

const buildHandler = (defaultMessage = DEFAULT_MESSAGE) => {
  return (req, res, _next, options) => {
    const retryAfter = toRetryAfterSeconds(req);

    if (retryAfter !== undefined) {
      res.set('Retry-After', retryAfter.toString());
    }

    res.status(options.statusCode).json({
      message:
        typeof options.message === 'string' && options.message.length > 0
          ? options.message
          : defaultMessage,
      code: RATE_LIMIT_CODE,
      retryAfter,
    });
  };
};

const createLimiter = ({
  windowMs,
  max,
  message,
  keyGenerator,
  skipFailedRequests,
  skipSuccessfulRequests,
}) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: buildHandler(message),
    keyGenerator,
    skipFailedRequests,
    skipSuccessfulRequests,
  });
};

const extractEmail = (req) => {
  const email =
    req?.validatedData?.body?.email ??
    req?.validatedData?.query?.email ??
    req?.body?.email ??
    req?.query?.email;

  if (!email || typeof email !== 'string') {
    return 'unknown-email';
  }

  return email.trim().toLowerCase();
};

// Authentication rate limiters
export const loginIpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts from this IP. Please wait 15 minutes.',
  skipSuccessfulRequests: true,
});

export const loginAccountLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts for this account. Please wait 15 minutes.',
  keyGenerator: (req) => `login-account:${extractEmail(req)}`,
  skipSuccessfulRequests: true,
});

export const registerIpLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many registration attempts from this IP. Please wait an hour before trying again.',
});

export const passwordResetIpLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password reset requests from this IP. Please try again in an hour.',
});

export const passwordResetEmailLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 1,
  message: 'A password reset email was recently sent. Please wait 10 minutes before requesting another.',
  keyGenerator: (req) => `password-reset:${extractEmail(req)}`,
});

export const resendVerificationIpLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many verification email requests from this IP. Please try again later.',
});

export const resendVerificationEmailHourlyLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many verification emails requested for this account. Please wait before trying again.',
  keyGenerator: (req) => `verification-hour:${extractEmail(req)}`,
});

export const resendVerificationEmailCooldownLimiter = createLimiter({
  windowMs: 2 * 60 * 1000,
  max: 1,
  message: 'Please wait 2 minutes before requesting another verification email.',
  keyGenerator: (req) => `verification-cooldown:${extractEmail(req)}`,
});

export const refreshTokenLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many refresh requests. Please slow down.',
});

export const logoutLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many logout attempts. Please wait a moment before trying again.',
});

// Public submissions
const submissionKey = (req) => {
  const formId = req?.validatedData?.params?.formId ?? req?.params?.formId ?? 'unknown-form';
  return `${formId}:${req.ip}`;
};

export const submissionPerFormLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many submissions for this form from this IP. Please wait a minute before trying again.',
  keyGenerator: submissionKey,
});

export const submissionGlobalIpLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: 'Too many submissions from this IP. Please wait before submitting again.',
});
