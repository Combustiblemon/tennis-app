import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import UserModel from '../models/User';
import { authUserHelper, ERRORS, onSuccess } from '../modules/common';
import { ServerError } from '../modules/error';

export const updateToken = async (
  req: Request,
  res: Response,
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

  usr?.addToken(FCMToken);

  await usr?.save();

  res.status(200).json(onSuccess({}, 'user/id', 'PUT'));
};

export default {
  updateToken,
};
