import { Request, Response } from 'express';
import { z } from 'zod';

import { authUserHelper, ERRORS, onSuccess } from '../modules/common';
import { ServerError } from '../modules/error';
import UserService from '../services/userService';

const parseToken = (req: Request): string => {
  try {
    return z
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
};

export const updateToken = async (req: Request, res: Response) => {
  const { user } = authUserHelper(req);

  if (!user) {
    return;
  }

  const FCMToken = parseToken(req);
  const tokenExists = user.FCMTokens.includes(FCMToken);

  if (!tokenExists) {
    const added = await UserService.addFCMToken(user.id, FCMToken);

    if (!added) {
      throw new ServerError({
        error: ERRORS.INTERNAL_SERVER_ERROR,
        status: 500,
        operation: req.method,
        endpoint: 'notifications',
        data: {
          FCMToken,
        },
      });
    }
  }

  res.status(200).json(onSuccess({}, 'notifications', 'PUT'));
};

export const deleteToken = async (req: Request, res: Response) => {
  const { user } = authUserHelper(req);

  if (!user) {
    return;
  }

  const FCMToken = parseToken(req);

  if (user.FCMTokens.includes(FCMToken)) {
    const removed = await UserService.removeFCMToken(user.id, FCMToken);

    if (!removed) {
      throw new ServerError({
        error: ERRORS.INTERNAL_SERVER_ERROR,
        status: 500,
        operation: req.method,
        endpoint: 'notifications',
        data: {
          FCMToken,
        },
      });
    }
  }

  // Idempotent: a token the server no longer knows about still returns 200 so
  // logout never fails on stale notification state.
  res.status(200).json(onSuccess({}, 'notifications', 'DELETE'));
};

export default {
  deleteToken,
  updateToken,
};
