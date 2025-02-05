import { Request, Response } from 'express';
import signale from 'signale';
import { z } from 'zod';

import UserModel from '../models/User';
import { authUserHelper, ERRORS, onSuccess } from '../modules/common';
import { ServerError } from '../modules/error';

const updateOne = async (req: Request, res: Response) => {
  const { user } = authUserHelper(req);

  if (!user) {
    return;
  }

  let name: string;

  try {
    name = z
      .object({
        name: z.string().min(1).max(60),
      })
      .parse(req.body).name;
  } catch (error) {
    throw new ServerError({
      error: ERRORS.INVALID_DATA,
      status: 400,
      operation: req.method,
      endpoint: 'user',
      data: {
        error,
      },
    });
  }

  await UserModel.findByIdAndUpdate(user._id, { name });

  res.status(200).json(onSuccess({ name }, 'user/id', 'PUT'));
};

export const getCurrent = async (req: Request, res: Response) => {
  const user = req.user;

  signale.debug('user:getCurrent');

  if (!user) {
    throw new ServerError({
      error: ERRORS.INTERNAL_SERVER_ERROR,
      operation: req.method as 'GET',
      status: 500,
      endpoint: 'user',
    });
  }

  res.status(200).json(onSuccess(user.sanitize(), 'user', 'GET'));
};

export default {
  getCurrent,
  updateOne,
};
