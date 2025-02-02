import { Request, Response } from 'express';
import { z } from 'zod';

import UserModel from '../models/User';
import { authUserHelper, ERRORS, onError, onSuccess } from '../modules/common';
import { ServerError } from '../modules/error';

const updateOne = async (req: Request, res: Response) => {
  const { user } = authUserHelper(req);

  if (!user) {
    return;
  }

  let name: string;

  try {
    name = z.string().min(1).max(60).parse(req.body);
  } catch (error) {
    throw new ServerError({
      error: ERRORS.INVALID_DATA,
    });
  }

  await UserModel.findByIdAndUpdate(user._id, { name });

  res.status(200).json(onSuccess({ name }, 'user/id', 'PUT'));
};

export default {
  updateOne,
};
