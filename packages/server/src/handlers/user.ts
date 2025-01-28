import { Request, Response } from 'express';
import { z } from 'zod';

import UserModel from '../models/User';
import { authUserHelper, onError, onSuccess } from '../modules/common';

const updateOne = async (req: Request, res: Response) => {
  const { user } = authUserHelper(req);

  if (!user) {
    return;
  }

  let name: string;

  try {
    name = z.string().min(1).max(60).parse(req.body);
  } catch (error) {
    return res.status(400).json(onError(error as Error, 'user/id', 'PUT'));
  }

  await UserModel.findByIdAndUpdate(user._id, { name });

  res.status(200).json(onSuccess({ name }, 'user/id', 'PUT'));
};

export default {
  updateOne,
};
