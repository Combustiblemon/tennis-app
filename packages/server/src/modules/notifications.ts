import firebaseAdmin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import signale from 'signale';

const { credential, messaging } = firebaseAdmin;

export enum Topics {
  ADMIN = 'admin',
  USER = 'user',
  TOURNAMENT = 'tournament',
}

const topicMap = {
  USER: [Topics.USER, Topics.TOURNAMENT],
  ADMIN: [Topics.ADMIN],
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

export const sendMessageToTokens = (
  tokens: string[],
  data: Record<string, string>,
) => {
  if (!tokens.length) {
    return;
  }

  initFirebaseApp();

  // Send a message to the device corresponding to the provided
  // registration token.
  messaging()
    .sendEachForMulticast({
      data,
      tokens,
    })
    .then((response) => {
      // Response is a message ID string.
      signale.info('Successfully sent message to tokens:', response);
    })
    .catch((error) => {
      signale.error('Error sending message to tokens:', error);
    });
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
      signale.info(`Successfully sent message to topic ${topic}:`, response);
    })
    .catch((error) => {
      signale.error(`Error sending message to topic ${topic}:`, error);
    });
};

export const subscribeToTopic = async (
  tokens: string[],
  topic: Topics | Array<Topics>,
) => {
  if (!tokens.length) {
    return;
  }

  initFirebaseApp();

  if (typeof topic === 'string') {
    const res = await messaging().subscribeToTopic(tokens, topic);

    if (res.errors.length > 0) {
      signale.error(res.errors);
    }
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
    } else {
      signale.info(`subscribed tokens to topics`);
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
    return;
  }

  const topics = topicMap.USER as unknown as Array<Topics>;

  if (userType === 'ADMIN') {
    topics.push(...topicMap.ADMIN);
  }

  await subscribeToTopic(tokens, topics);
};

export const unsubscribeUser = async (
  userType: keyof typeof topicMap,
  tokens: Array<string>,
) => {
  if (!tokens || !tokens.length) {
    return;
  }

  const topics = topicMap.USER as unknown as Array<Topics>;

  if (userType === 'ADMIN') {
    topics.push(...topicMap.ADMIN);
  }

  await unsubscribeFromTopic(tokens, topics);
};
