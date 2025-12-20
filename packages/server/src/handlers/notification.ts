import { NextFunction, Request, Response } from 'express';
import signale from 'signale';
import { z } from 'zod';

import { authUserHelper, ERRORS, onError, onSuccess } from '../modules/common';
import { ServerError } from '../modules/error';
import { subscribeUser } from '../modules/notifications';
import UserService from '../services/userService';

export const updateToken = async (
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  const { user } = authUserHelper(req);

  if (!user) {
    return;
  }

  let FCMToken: string;

  try {
    FCMToken = z
      .object({
        token: z.string(),
      })
      .parse(req.body).token;
  } catch (error) {
    throw new ServerError({
      error: ERRORS.INVALID_DATA,
      status: 400,
      operation: req.method,
      endpoint: 'notifications',
      data: {
        error,
      },
    });
  }

  // Check if token already exists in user's metadata
  const tokenExists = user.FCMTokens.includes(FCMToken);

  // Subscribe token to topics based on user role
  const subscribed = await subscribeUser(user.role, [FCMToken]);

  if (subscribed) {
    // If subscription succeeded, add token to metadata (if not already there)
    if (!tokenExists) {
      const added = await UserService.addFCMToken(user.id, FCMToken);

      if (!added) {
        signale.warn(
          `Failed to add FCM token ${FCMToken} to user ${user.id} metadata`,
        );
      }
    } else {
      signale.info(
        `FCM token ${FCMToken} already exists for user ${user.id}, subscription refreshed`,
      );
    }
    res.status(200).json(onSuccess({}, 'user/id', 'PUT'));
  } else {
    // If subscription failed, remove token from metadata (if it exists)
    if (tokenExists) {
      const removed = await UserService.removeFCMToken(user.id, FCMToken);

      if (removed) {
        signale.warn(
          `Removed FCM token ${FCMToken} from user ${user.id} due to subscription failure`,
        );
      }
    }
    res.status(200).json(
      onError(
        new ServerError({
          error: ERRORS.FAILED_TO_SUBSCRIBE_TO_TOPIC,
          status: 400,
          operation: req.method,
          endpoint: 'notifications',
          data: {
            FCMToken,
          },
        }),
      ),
    );
  }
};

export default {
  updateToken,
};
