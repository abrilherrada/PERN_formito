import express from 'express';
import request from 'supertest';
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  test,
} from '@jest/globals';

const limiterNames = [
  'loginIpLimiter',
  'loginAccountLimiter',
  'registerIpLimiter',
  'passwordResetIpLimiter',
  'passwordResetEmailLimiter',
  'resendVerificationIpLimiter',
  'resendVerificationEmailHourlyLimiter',
  'resendVerificationEmailCooldownLimiter',
  'refreshTokenLimiter',
  'logoutLimiter',
  'submissionPerFormLimiter',
  'submissionGlobalIpLimiter',
];

let limitersModule;
let LIMITERS = [];

const loadLimiters = async () => {
  limitersModule = await import(
    `../src/middleware/rateLimiters.js?cache=${Date.now().toString(36)}`
  );

  LIMITERS = limiterNames.map((name) => {
    const limiter = limitersModule[name];

    if (!limiter) {
      throw new Error(`Limiter ${name} is not exported from rateLimiters.js`);
    }

    return limiter;
  });
};

const getLimiter = (name) => {
  const limiter = limitersModule?.[name];

  if (!limiter) {
    throw new Error(`Limiter ${name} has not been loaded yet`);
  }

  return limiter;
};

const resetLimiterStore = (limiter) => {
  const store = limiter?.store;

  if (!store) {
    return;
  }

  if (typeof store.resetAll === 'function') {
    store.resetAll();
    return;
  }

  if (typeof store.clear === 'function') {
    store.clear();
    return;
  }

  const StoreCtor = store.constructor;
  if (typeof StoreCtor === 'function') {
    try {
      limiter.store = new StoreCtor(store.options ?? {});
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to reinstantiate limiter store during reset:', error);
    }
  }
};

const resetAllLimiters = () => {
  LIMITERS.forEach((limiter) => resetLimiterStore(limiter));
};

const setValidated = (location) => (req, _res, next) => {
  req.validatedData = {
    ...(req.validatedData ?? {}),
    [location]: req[location],
  };

  next();
};

const createAuthTestApp = () => {
  const app = express();
  app.use(express.json());

  app.post(
    '/auth/register',
    getLimiter('registerIpLimiter'),
    setValidated('body'),
    (_req, res) => res.status(201).json({ ok: true })
  );

  app.post(
    '/auth/login',
    setValidated('body'),
    getLimiter('loginAccountLimiter'),
    getLimiter('loginIpLimiter'),
    (_req, res) => res.status(401).json({ message: 'Invalid credentials' })
  );

  app.post(
    '/auth/resend-verification',
    setValidated('body'),
    getLimiter('resendVerificationEmailCooldownLimiter'),
    getLimiter('resendVerificationEmailHourlyLimiter'),
    getLimiter('resendVerificationIpLimiter'),
    (_req, res) => res.status(200).json({ ok: true })
  );

  app.post(
    '/auth/reset-password',
    setValidated('body'),
    getLimiter('passwordResetEmailLimiter'),
    getLimiter('passwordResetIpLimiter'),
    (_req, res) => res.status(200).json({ ok: true })
  );

  app.post(
    '/auth/refresh',
    getLimiter('refreshTokenLimiter'),
    setValidated('body'),
    (_req, res) => res.status(200).json({ ok: true })
  );

  app.post(
    '/auth/logout',
    setValidated('body'),
    getLimiter('logoutLimiter'),
    (_req, res) => res.status(204).send()
  );

  return app;
};

const createFormsTestApp = () => {
  const app = express();
  app.use(express.json());

  app.post(
    '/forms/:formId',
    getLimiter('submissionGlobalIpLimiter'),
    getLimiter('submissionPerFormLimiter'),
    setValidated('params'),
    setValidated('body'),
    (_req, res) => res.status(200).json({ ok: true })
  );

  return app;
};

describe('Auth rate limiters', () => {
  beforeEach(async () => {
    await loadLimiters();
    resetAllLimiters();
  });

  afterEach(() => {
    resetAllLimiters();
  });

  test('login account limiter blocks after five failed attempts for the same account', async () => {
    const app = createAuthTestApp();
    const payload = { email: 'login@example.com', password: 'wrong-password' };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await request(app).post('/auth/login').send(payload);
      expect(res.status).toBe(401);
    }

    const blocked = await request(app).post('/auth/login').send(payload);
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  test('login IP limiter blocks after ten failed attempts across accounts from the same IP', async () => {
    const app = createAuthTestApp();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: `user${attempt}@example.com`, password: 'wrong-password' });
      expect(res.status).toBe(401);
    }

    const blocked = await request(app)
      .post('/auth/login')
      .send({ email: 'user-extra@example.com', password: 'wrong-password' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  test('register IP limiter blocks after five attempts from the same IP', async () => {
    const app = createAuthTestApp();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await request(app)
        .post('/auth/register')
        .send({ name: 'User', email: `register${attempt}@example.com`, password: 'Password123!' });
      expect(res.status).toBe(201);
    }

    const blocked = await request(app)
      .post('/auth/register')
      .send({ name: 'User', email: 'register-final@example.com', password: 'Password123!' });
    expect(blocked.status).toBe(429);
  });

  test('password reset email limiter blocks repeated requests for the same email within cooldown', async () => {
    const app = createAuthTestApp();
    const email = 'reset@example.com';

    const first = await request(app).post('/auth/reset-password').send({ email });
    expect(first.status).toBe(200);

    const blocked = await request(app).post('/auth/reset-password').send({ email });
    expect(blocked.status).toBe(429);
    expect(blocked.body.retryAfter).toBeGreaterThan(0);
  });

  test('password reset IP limiter blocks after three requests from the same IP', async () => {
    const app = createAuthTestApp();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await request(app)
        .post('/auth/reset-password')
        .send({ email: `reset-ip${attempt}@example.com` });
      expect(res.status).toBe(200);
    }

    const blocked = await request(app)
      .post('/auth/reset-password')
      .send({ email: 'reset-ip-final@example.com' });
    expect(blocked.status).toBe(429);
  });

  test('resend verification cooldown limiter enforces a wait period', async () => {
    const app = createAuthTestApp();
    const email = 'cooldown@example.com';

    const first = await request(app).post('/auth/resend-verification').send({ email });
    expect(first.status).toBe(200);

    const blocked = await request(app).post('/auth/resend-verification').send({ email });
    expect(blocked.status).toBe(429);
    expect(blocked.body.retryAfter).toBeGreaterThan(0);
  });

  test('resend verification hourly limiter blocks after five requests for the same email', async () => {
    const app = createAuthTestApp();
    const email = 'hourly@example.com';
    const cooldownKey = `verification-cooldown:${email}`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await request(app).post('/auth/resend-verification').send({ email });
      expect(res.status).toBe(200);
      getLimiter('resendVerificationEmailCooldownLimiter').resetKey?.(cooldownKey);
    }

    const blocked = await request(app).post('/auth/resend-verification').send({ email });
    expect(blocked.status).toBe(429);
  });

  test('resend verification IP limiter blocks after twenty requests from the same IP', async () => {
    const app = createAuthTestApp();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const email = `ip${attempt}@example.com`;
      const res = await request(app).post('/auth/resend-verification').send({ email });
      expect(res.status).toBe(200);
      const cooldownKey = `verification-cooldown:${email}`;
      getLimiter('resendVerificationEmailCooldownLimiter').resetKey?.(cooldownKey);
    }

    const blocked = await request(app)
      .post('/auth/resend-verification')
      .send({ email: 'ip-final@example.com' });
    expect(blocked.status).toBe(429);
  });

  test('refresh token limiter blocks after twenty requests per minute', async () => {
    const app = createAuthTestApp();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: `token-${attempt}` });
      expect(res.status).toBe(200);
    }

    const blocked = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'token-final' });
    expect(blocked.status).toBe(429);
  });

  test('logout limiter blocks after twenty requests per minute', async () => {
    const app = createAuthTestApp();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const res = await request(app)
        .post('/auth/logout')
        .send({ refreshToken: `token-${attempt}` });
      expect(res.status).toBe(204);
    }

    const blocked = await request(app)
      .post('/auth/logout')
      .send({ refreshToken: 'token-final' });
    expect(blocked.status).toBe(429);
  });
});

describe('Submission rate limiters', () => {
  beforeEach(async () => {
    await loadLimiters();
    resetAllLimiters();
  });

  afterEach(() => {
    resetAllLimiters();
  });

  test('submission per form limiter blocks after ten submissions for the same form', async () => {
    const app = createFormsTestApp();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = await request(app)
        .post('/forms/form-123')
        .send({ data: { attempt } });
      expect(res.status).toBe(200);
    }

    const blocked = await request(app)
      .post('/forms/form-123')
      .send({ data: { attempt: 11 } });
    expect(blocked.status).toBe(429);
  });

  test('submission global IP limiter blocks after one hundred submissions across forms', async () => {
    const app = createFormsTestApp();

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const res = await request(app)
        .post(`/forms/form-${attempt}`)
        .send({ data: { attempt } });
      expect(res.status).toBe(200);
    }

    const blocked = await request(app)
      .post('/forms/form-ultimate')
      .send({ data: { attempt: 101 } });
    expect(blocked.status).toBe(429);
  });
});