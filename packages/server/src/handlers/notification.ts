import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import UserModel from '../models/User';
import { authUserHelper, ERRORS, onError, onSuccess } from '../modules/common';
import { ServerError } from '../modules/error';
import { subscribeUser } from '../modules/notifications';

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

  const usr = await UserModel.findById(user._id);

  if (!usr) {
    throw new Error('no user found');
  }

  const subscribed = await subscribeUser(usr.role, [FCMToken]);

  if (subscribed) {
    usr?.addToken(FCMToken);
  } else {
    usr?.removeToken(FCMToken);
  }

  await usr?.save();

  if (subscribed) {
    res.status(200).json(onSuccess({}, 'user/id', 'PUT'));
  } else {
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
