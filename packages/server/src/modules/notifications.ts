import firebaseAdmin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import signale from 'signale';

import UserModel from '../models/User';

const { credential, messaging } = firebaseAdmin;

export enum Topics {
  ADMIN = 'admin',
  USER = 'user',
  TOURNAMENT = 'tournament',
  DEVELOPER = 'developer',
}

const topicMap = {
  USER: [Topics.USER, Topics.TOURNAMENT],
  ADMIN: [Topics.ADMIN],
  DEVELOPER: [Topics.DEVELOPER],
} as const;

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
      if (
        r.error &&
        r.error.code === 'messaging/registration-token-not-registered'
      ) {
        failedTokens.push(tokens[i]);
      }
    });

    if (failedTokens.length) {
      signale.error(
        'Failed to send message to tokens:',
        JSON.stringify(failedTokens, null, 2),
      );

      const users = await UserModel.find({
        FCMTokens: { $in: failedTokens },
      });

      users.forEach((user) => {
        failedTokens.forEach((token) => {
          user.removeToken(token);
        });
        user.save();
      });

      signale.info(
        'Removed failed tokens from users:',
        JSON.stringify(
          users.map((u) => u.email),
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

export const sendMessageToTopic = (
  topic: Topics,
  data: Record<string, string>,
) => {
  initFirebaseApp();

  messaging()
    .send({
      topic,
      data,
    })
    .then((response) => {
      signale.info(
        `Successfully sent message to topic ${topic}:`,
        JSON.stringify(response, null, 2),
      );
    })
    .catch((error) => {
      signale.error(
        `Error sending message to topic ${topic}:`,
        JSON.stringify(error, null, 2),
      );
    });
};

export const subscribeToTopic = async (
  tokens: string[],
  topic: Topics | Array<Topics>,
) => {
  if (!tokens.length) {
    return true;
  }

  initFirebaseApp();

  if (typeof topic === 'string') {
    const res = await messaging().subscribeToTopic(tokens, topic);

    if (res.errors.length > 0) {
      signale.error(res.errors);
      return false;
    }

    return true;
  } else {
    const res = await Promise.allSettled(
      topic.map(async (t) => {
        return [await messaging().subscribeToTopic(tokens, t), t] as const;
      }),
    );

    if (
      res.some(
        (r) =>
          (r.status === 'fulfilled' && r.value[0].failureCount > 0) ||
          r.status === 'rejected',
      )
    ) {
      const errors = res.map((p) => {
        if (p.status === 'rejected') {
          return [p.reason as unknown] as const;
        }

        if (p.value[0].failureCount > 0) {
          return [
            p.value[0].errors,
            p.value[1],
            p.value[0].errors[0].index,
          ] as const;
        }

        return [];
      });

      signale.error('subscribeToTopic', JSON.stringify(errors, null, 2));

      if (errors.length) {
        return false;
      }

      return true;
    } else {
      signale.info(`subscribed tokens to topics`);
      return true;
    }
  }
};

export const unsubscribeFromTopic = async (
  tokens: string[],
  topic: Topics | Array<Topics>,
) => {
  if (!tokens.length) {
    return;
  }

  initFirebaseApp();

  if (typeof topic === 'string') {
    const res = await messaging().unsubscribeFromTopic(tokens, topic);

    if (res.errors.length > 0) {
      signale.error(res.errors);
    }
  } else {
    const res = await Promise.allSettled(
      topic.map(async (t) => {
        return [await messaging().unsubscribeFromTopic(tokens, t), t] as const;
      }),
    );

    if (
      res.some(
        (r) =>
          (r.status === 'fulfilled' && r.value[0].failureCount > 0) ||
          r.status === 'rejected',
      )
    ) {
      const errors = res.map((p) => {
        if (p.status === 'rejected') {
          return [p.reason as unknown] as const;
        }

        if (p.value[0].failureCount > 0) {
          return [p.value[0].errors, p.value[1]] as const;
        }

        return [];
      });

      signale.error(JSON.stringify(errors, null, 2));
    } else {
      signale.info(`unsubscribed tokens to topics`);
    }
  }
};

export const subscribeUser = async (
  userType: keyof typeof topicMap,
  tokens: Array<string>,
) => {
  if (!tokens || !tokens.length) {
    return false;
  }

  const topics = topicMap.USER as unknown as Array<Topics>;

  if (userType === 'ADMIN' || userType === 'DEVELOPER') {
    topics.push(...topicMap.ADMIN);
  }

  return subscribeToTopic(tokens, topics);
};

export const unsubscribeUser = async (
  userType: keyof typeof topicMap,
  tokens: Array<string>,
) => {
  if (!tokens || !tokens.length) {
    return;
  }

  const topics = topicMap.USER as unknown as Array<Topics>;

  if (userType === 'ADMIN' || userType === 'DEVELOPER') {
    topics.push(...topicMap.ADMIN);
  }

  await unsubscribeFromTopic(tokens, topics);
};
