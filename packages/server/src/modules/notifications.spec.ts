/**
 * Tests for sendMessageToTokens — multicast send + dead-token pruning.
 *
 * Regression targets from the 2026-08-06 notification fix:
 * - Both permanently-dead FCM error codes are pruned
 *   (registration-token-not-registered AND invalid-registration-token).
 * - Other error codes (e.g. invalid-argument, which can be a payload bug)
 *   must NOT delete tokens.
 * - Send failures are contained: the caller gets an empty failed list, no
 *   throw.
 */
import type { User } from '../services/userService';
import UserService from '../services/userService';
import { sendMessageToTokens } from './notifications';

jest.mock('signale', () => ({
  error: jest.fn(),
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
}));

const sendEachForMulticast = jest.fn();

jest.mock('firebase-admin', () => ({
  __esModule: true,
  default: {
    credential: { cert: jest.fn() },
    messaging: jest.fn(() => ({
      sendEachForMulticast: (...args: unknown[]) =>
        sendEachForMulticast(...args),
    })),
  },
}));

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('../services/userService', () => ({
  __esModule: true,
  default: {
    getAdminUsers: jest.fn(),
    getUsersByRole: jest.fn(),
    removeFCMToken: jest.fn(),
  },
}));

const mockedUserService = jest.mocked(UserService);

const makeUser = (id: string, tokens: string[]): User => ({
  FCMTokens: tokens,
  email: `${id}@example.com`,
  firstname: null,
  id,
  lastname: null,
  role: 'ADMIN',
});

const okResponse = { error: undefined };
const errorResponse = (code: string) => ({ error: { code } });

describe('sendMessageToTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUserService.getUsersByRole.mockResolvedValue([]);
    mockedUserService.getAdminUsers.mockResolvedValue([]);
    mockedUserService.removeFCMToken.mockResolvedValue(true);
  });

  it('returns early without sending when there are no tokens', async () => {
    const failed = await sendMessageToTokens([], { title: 't' });

    expect(failed).toEqual([]);
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('passes data and tokens through to the multicast send', async () => {
    sendEachForMulticast.mockResolvedValue({
      responses: [okResponse, okResponse],
    });

    await sendMessageToTokens(['a', 'b'], { body: 'b', title: 't' });

    expect(sendEachForMulticast).toHaveBeenCalledWith({
      data: { body: 'b', title: 't' },
      tokens: ['a', 'b'],
    });
  });

  it('prunes nothing when every send succeeds', async () => {
    sendEachForMulticast.mockResolvedValue({
      responses: [okResponse, okResponse],
    });

    const failed = await sendMessageToTokens(['a', 'b'], { title: 't' });

    expect(failed).toEqual([]);
    expect(mockedUserService.getUsersByRole).not.toHaveBeenCalled();
    expect(mockedUserService.removeFCMToken).not.toHaveBeenCalled();
  });

  it('prunes both permanently-dead token error codes but not other errors', async () => {
    sendEachForMulticast.mockResolvedValue({
      responses: [
        errorResponse('messaging/registration-token-not-registered'),
        errorResponse('messaging/invalid-registration-token'),
        errorResponse('messaging/invalid-argument'),
        okResponse,
      ],
    });
    mockedUserService.getUsersByRole.mockResolvedValue([
      makeUser('user-1', ['dead-1']),
    ]);
    mockedUserService.getAdminUsers.mockResolvedValue([
      makeUser('admin-1', ['dead-2', 'payload-bug', 'alive']),
    ]);

    const failed = await sendMessageToTokens(
      ['dead-1', 'dead-2', 'payload-bug', 'alive'],
      { title: 't' },
    );

    expect(failed).toEqual(['dead-1', 'dead-2']);
    expect(mockedUserService.removeFCMToken).toHaveBeenCalledWith(
      'user-1',
      'dead-1',
    );
    expect(mockedUserService.removeFCMToken).toHaveBeenCalledWith(
      'admin-1',
      'dead-2',
    );
    expect(mockedUserService.removeFCMToken).not.toHaveBeenCalledWith(
      'admin-1',
      'payload-bug',
    );
    expect(mockedUserService.removeFCMToken).not.toHaveBeenCalledWith(
      'admin-1',
      'alive',
    );
  });

  it('only removes a failed token from users that actually hold it', async () => {
    sendEachForMulticast.mockResolvedValue({
      responses: [errorResponse('messaging/registration-token-not-registered')],
    });
    mockedUserService.getUsersByRole.mockResolvedValue([
      makeUser('user-1', ['other-token']),
    ]);
    mockedUserService.getAdminUsers.mockResolvedValue([
      makeUser('admin-1', ['dead-1']),
    ]);

    await sendMessageToTokens(['dead-1'], { title: 't' });

    expect(mockedUserService.removeFCMToken).toHaveBeenCalledTimes(1);
    expect(mockedUserService.removeFCMToken).toHaveBeenCalledWith(
      'admin-1',
      'dead-1',
    );
  });

  it('contains multicast failures and returns an empty failed list', async () => {
    sendEachForMulticast.mockRejectedValue(new Error('FCM unavailable'));

    const failed = await sendMessageToTokens(['a'], { title: 't' });

    expect(failed).toEqual([]);
    expect(mockedUserService.removeFCMToken).not.toHaveBeenCalled();
  });
});
