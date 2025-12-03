import {
  registerService,
  loginService,
  resendVerificationService,
  verifyEmailService,
  requestPasswordResetService,
  resetPasswordService,
  refreshAccessTokenService,
  logoutService,
} from '../services/auth.js';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenCookieName,
} from '../utils/manageSessionToken.js';

export const registerUser = async (req, res, next) => {
  try {
    const result = await registerService(req.validatedData.body);
    res
      .status(201)
      .json(result);
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const {
      headers: { 'user-agent': userAgent = null },
      ip = null,
    } = req;

    const { accessToken, refreshToken, user } = await loginService(req.validatedData.body, {
      userAgent,
      ipAddress: ip,
    });

    setRefreshTokenCookie(res, refreshToken);

    res
      .status(200)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ token: accessToken, user });
  } catch (error) {
    next(error);
  }
};

export const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.validatedData.body;
    const result = await resendVerificationService(email);
    res
      .status(200)
      .json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { selector, token } = req.validatedData.query;
    const result = await verifyEmailService(selector, token);
    res
      .status(200)
      .json(result);
  } catch (error) {
    next(error);
  }
};

export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.validatedData.body;
    const result = await requestPasswordResetService(email);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const confirmPasswordReset = async (req, res, next) => {
  try {
    const { selector, token, newPassword } = req.validatedData.body;
    const result = await resetPasswordService(selector, token, newPassword);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const {
      headers: { 'user-agent': userAgent = null },
      ip = null,
    } = req;

    const cookieName = getRefreshTokenCookieName();
    const refreshTokenFromCookie = req.cookies?.[cookieName] ?? null;
    const refreshTokenFromBody =
      req.validatedData?.body?.refreshToken ?? req.body?.refreshToken ?? null;

    const { accessToken, refreshToken: newRefreshToken, user } = await refreshAccessTokenService(
      refreshTokenFromCookie ?? refreshTokenFromBody,
      {
        userAgent,
        ipAddress: ip,
      }
    );

    setRefreshTokenCookie(res, newRefreshToken);

    res
      .status(200)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ token: accessToken, user });
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    const cookieName = getRefreshTokenCookieName();
    const refreshTokenFromCookie = req.cookies?.[cookieName] ?? null;
    const { refreshToken: refreshTokenFromBody = null, sessionTokenId = null } =
      req.validatedData?.body ?? req.body ?? {};

    await logoutService({
      refreshToken: refreshTokenFromCookie ?? refreshTokenFromBody,
      sessionTokenId,
    });

    clearRefreshTokenCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};