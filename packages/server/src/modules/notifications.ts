import firebaseAdmin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import signale from 'signale';

import UserService from '../services/userService';

const { credential, messaging } = firebaseAdmin;

// FCM error codes that mean the token is permanently dead and must be removed
// from the owning user's Clerk metadata.
const PRUNEABLE_ERROR_CODES: ReadonlyArray<string> = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
];

let app = false;

export const initFirebaseApp = () => {
  try {
    if (!app) {
      initializeApp({
        credential: credential.cert(
          JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS || '{}'),
        ),
      });

      app = true;
    }
  } catch (err) {
    if (
      (err as Error).message.startsWith(
        'The default Firebase app already exists.',
      )
    ) {
      app = true;
      return;
    }

    signale.error(err);
  }
};

export const sendMessageToTokens = async (
  tokens: string[],
  data: Record<string, string>,
): Promise<Array<string>> => {
  if (!tokens.length) {
    return [];
  }

  initFirebaseApp();

  const failedTokens: Array<string> = [];

  try {
    // Send a message to the device corresponding to the provided
    // registration token.
    const res = await messaging().sendEachForMulticast({
      data,
      tokens,
    });

    res.responses.forEach((r, i) => {
      if (r.error && PRUNEABLE_ERROR_CODES.includes(r.error.code)) {
        failedTokens.push(tokens[i]);
      }
    });

    if (failedTokens.length) {
      signale.error(
        'Failed to send message to tokens:',
        JSON.stringify(failedTokens, null, 2),
      );

      // Get all users and find which ones have the failed tokens
      // Note: This is not optimal, but Clerk doesn't support querying by metadata
      // For better performance, consider caching user data or using a different approach
      const allUsers = await UserService.getUsersByRole('USER');
      const adminUsers = await UserService.getAdminUsers();
      const allUsersList = [...allUsers, ...adminUsers];

      const usersWithFailedTokens = allUsersList.filter((user) =>
        user.FCMTokens.some((token) => failedTokens.includes(token)),
      );

      // Remove failed tokens from each user
      await Promise.allSettled(
        usersWithFailedTokens.map(async (user) => {
          for (const token of failedTokens) {
            if (user.FCMTokens.includes(token)) {
              await UserService.removeFCMToken(user.id, token);
            }
          }
        }),
      );

      signale.info(
        'Removed failed tokens from users:',
        JSON.stringify(
          usersWithFailedTokens.map((u) => u.email),
          null,
          2,
        ),
      );
    }

    // Response is a message ID string.
    signale.info(
      'Successfully sent message to tokens:',
      JSON.stringify(res, null, 2),
    );
  } catch (error) {
    signale.error(
      'Error sending message to tokens:',
      JSON.stringify(error, null, 2),
    );
  }

  return failedTokens;
};
