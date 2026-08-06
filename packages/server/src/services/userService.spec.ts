/**
 * Tests for UserService FCM-token metadata handling (Clerk privateMetadata).
 *
 * Covers the storage layer under the 2026-08-06 notification fix: exact-string
 * dedupe on add, non-destructive merges (other privateMetadata keys survive),
 * and graceful `false` returns on Clerk failures.
 */
import { clerkClient } from '../modules/clerk';
import { UserService } from './userService';

jest.mock('signale', () => ({
  error: jest.fn(),
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../modules/clerk', () => ({
  clerkClient: {
    users: {
      getUser: jest.fn(),
      updateUserMetadata: jest.fn(),
    },
  },
}));

const mockedUsers = jest.mocked(clerkClient.users);

const clerkUserWith = (privateMetadata: Record<string, unknown>) =>
  ({ privateMetadata }) as never;

describe('UserService.addFCMToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsers.updateUserMetadata.mockResolvedValue({} as never);
  });

  it('appends the token while preserving existing metadata', async () => {
    mockedUsers.getUser.mockResolvedValue(
      clerkUserWith({ FCMTokens: ['old'], other: 'keep' }),
    );

    const added = await UserService.addFCMToken('user-1', 'new');

    expect(added).toBe(true);
    expect(mockedUsers.updateUserMetadata).toHaveBeenCalledWith('user-1', {
      privateMetadata: {
        FCMTokens: ['old', 'new'],
        other: 'keep',
      },
    });
  });

  it('starts a token list when none exists', async () => {
    mockedUsers.getUser.mockResolvedValue(clerkUserWith({}));

    const added = await UserService.addFCMToken('user-1', 'first');

    expect(added).toBe(true);
    expect(mockedUsers.updateUserMetadata).toHaveBeenCalledWith('user-1', {
      privateMetadata: { FCMTokens: ['first'] },
    });
  });

  it('dedupes by exact string without writing', async () => {
    mockedUsers.getUser.mockResolvedValue(
      clerkUserWith({ FCMTokens: ['tok'] }),
    );

    const added = await UserService.addFCMToken('user-1', 'tok');

    expect(added).toBe(false);
    expect(mockedUsers.updateUserMetadata).not.toHaveBeenCalled();
  });

  it('returns false when Clerk fails', async () => {
    mockedUsers.getUser.mockRejectedValue(new Error('clerk down'));

    const added = await UserService.addFCMToken('user-1', 'tok');

    expect(added).toBe(false);
  });
});

describe('UserService.removeFCMToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsers.updateUserMetadata.mockResolvedValue({} as never);
  });

  it('removes only the given token and preserves the rest', async () => {
    mockedUsers.getUser.mockResolvedValue(
      clerkUserWith({ FCMTokens: ['a', 'b', 'c'], other: 'keep' }),
    );

    const removed = await UserService.removeFCMToken('user-1', 'b');

    expect(removed).toBe(true);
    expect(mockedUsers.updateUserMetadata).toHaveBeenCalledWith('user-1', {
      privateMetadata: {
        FCMTokens: ['a', 'c'],
        other: 'keep',
      },
    });
  });

  it('returns false without writing when the token is unknown', async () => {
    mockedUsers.getUser.mockResolvedValue(clerkUserWith({ FCMTokens: ['a'] }));

    const removed = await UserService.removeFCMToken('user-1', 'missing');

    expect(removed).toBe(false);
    expect(mockedUsers.updateUserMetadata).not.toHaveBeenCalled();
  });

  it('returns false when Clerk fails', async () => {
    mockedUsers.getUser.mockResolvedValue(clerkUserWith({ FCMTokens: ['a'] }));
    mockedUsers.updateUserMetadata.mockRejectedValue(new Error('clerk down'));

    const removed = await UserService.removeFCMToken('user-1', 'a');

    expect(removed).toBe(false);
  });
});

describe('UserService.getUserFromClerk', () => {
  it('defaults role to USER and FCMTokens to an empty list', async () => {
    const user = await UserService.getUserFromClerk({
      emailAddresses: [{ emailAddress: 'a@example.com', id: 'em-1' }],
      firstName: null,
      id: 'user-1',
      lastName: null,
      primaryEmailAddressId: 'em-1',
      privateMetadata: {},
      publicMetadata: {},
    } as never);

    expect(user).toEqual({
      FCMTokens: [],
      email: 'a@example.com',
      firstname: null,
      id: 'user-1',
      lastname: null,
      role: 'USER',
    });
  });
});
