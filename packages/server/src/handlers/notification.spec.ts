/**
 * Tests for the notification token handlers.
 *
 * Regression targets from the 2026-08-06 notification fix:
 * - PUT stores tokens unconditionally (no topic-subscription gate) and NEVER
 *   deletes a stored token.
 * - Failures surface as thrown ServerError with a real HTTP status (the old
 *   handler answered 200 with an error body).
 * - DELETE is idempotent: unknown tokens still answer 200 so logout never
 *   blocks on stale notification state.
 */
import { Request, Response } from 'express';

import { ERRORS } from '../modules/common';
import { ServerError } from '../modules/error';
import UserService from '../services/userService';
import { deleteToken, updateToken } from './notification';

jest.mock('signale', () => ({
  error: jest.fn(),
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../services/userService', () => ({
  __esModule: true,
  default: {
    addFCMToken: jest.fn(),
    removeFCMToken: jest.fn(),
  },
}));

const mockedUserService = jest.mocked(UserService);

const makeReq = (overrides?: {
  body?: unknown;
  method?: string;
  tokens?: string[];
  user?: false;
}): Request => {
  return {
    body: overrides?.body ?? { token: 'tok-1' },
    method: overrides?.method ?? 'PUT',
    user:
      overrides?.user === false
        ? undefined
        : {
            FCMTokens: overrides?.tokens ?? [],
            email: 'admin@example.com',
            firstname: 'A',
            id: 'user-1',
            lastname: 'B',
            role: 'ADMIN',
          },
  } as unknown as Request;
};

const makeRes = () => {
  const res = {
    json: jest.fn(),
    status: jest.fn(),
  };
  res.status.mockReturnValue(res);

  return res as unknown as Response & typeof res;
};

describe('updateToken (PUT /notifications)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUserService.addFCMToken.mockResolvedValue(true);
  });

  it('stores a new token and answers 200 success', async () => {
    const res = makeRes();

    await updateToken(makeReq(), res);

    expect(mockedUserService.addFCMToken).toHaveBeenCalledWith(
      'user-1',
      'tok-1',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'notifications', success: true }),
    );
  });

  it('skips the Clerk write when the token is already stored', async () => {
    const res = makeRes();

    await updateToken(makeReq({ tokens: ['tok-1'] }), res);

    expect(mockedUserService.addFCMToken).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('never removes a stored token, even on failure paths', async () => {
    const res = makeRes();
    mockedUserService.addFCMToken.mockResolvedValue(false);

    await expect(updateToken(makeReq(), res)).rejects.toBeInstanceOf(
      ServerError,
    );

    expect(mockedUserService.removeFCMToken).not.toHaveBeenCalled();
  });

  it('throws a 500 ServerError when the Clerk write fails', async () => {
    const res = makeRes();
    mockedUserService.addFCMToken.mockResolvedValue(false);

    await expect(updateToken(makeReq(), res)).rejects.toMatchObject({
      error: ERRORS.INTERNAL_SERVER_ERROR,
      status: 500,
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('throws a 400 ServerError on an invalid body', async () => {
    const res = makeRes();

    await expect(
      updateToken(makeReq({ body: { nope: true } }), res),
    ).rejects.toMatchObject({
      error: ERRORS.INVALID_DATA,
      status: 400,
    });
    expect(mockedUserService.addFCMToken).not.toHaveBeenCalled();
  });

  it('does nothing without an authenticated user', async () => {
    const res = makeRes();

    await updateToken(makeReq({ user: false }), res);

    expect(mockedUserService.addFCMToken).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('deleteToken (DELETE /notifications)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUserService.removeFCMToken.mockResolvedValue(true);
  });

  it('removes a stored token and answers 200 success', async () => {
    const res = makeRes();

    await deleteToken(
      makeReq({ method: 'DELETE', tokens: ['tok-1', 'tok-2'] }),
      res,
    );

    expect(mockedUserService.removeFCMToken).toHaveBeenCalledWith(
      'user-1',
      'tok-1',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'notifications', success: true }),
    );
  });

  it('is idempotent: unknown token still answers 200 without a Clerk call', async () => {
    const res = makeRes();

    await deleteToken(makeReq({ method: 'DELETE', tokens: [] }), res);

    expect(mockedUserService.removeFCMToken).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('throws a 500 ServerError when the Clerk removal fails', async () => {
    const res = makeRes();
    mockedUserService.removeFCMToken.mockResolvedValue(false);

    await expect(
      deleteToken(makeReq({ method: 'DELETE', tokens: ['tok-1'] }), res),
    ).rejects.toMatchObject({
      error: ERRORS.INTERNAL_SERVER_ERROR,
      status: 500,
    });
  });

  it('throws a 400 ServerError on an invalid body', async () => {
    const res = makeRes();

    await expect(
      deleteToken(makeReq({ body: {}, method: 'DELETE' }), res),
    ).rejects.toMatchObject({
      error: ERRORS.INVALID_DATA,
      status: 400,
    });
  });

  it('does nothing without an authenticated user', async () => {
    const res = makeRes();

    await deleteToken(makeReq({ method: 'DELETE', user: false }), res);

    expect(mockedUserService.removeFCMToken).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
