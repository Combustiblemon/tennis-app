import { Request, Response } from 'express';
import { z } from 'zod';

import { authUserHelper, ERRORS, onSuccess } from '../modules/common';
import { ServerError } from '../modules/error';
import UserService from '../services/userService';

const updateOne = async (req: Request, res: Response) => {
  const { user } = authUserHelper(req);

  if (!user) {
    return;
  }

  let data: {
    firstname: string;
    lastname: string;
  };

  try {
    data = z
      .object({
        firstname: z.string().min(1).max(60),
        lastname: z.string().min(1).max(60),
      })
      .parse(req.body);
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

  await UserService.updateName(user.id, data.firstname, data.lastname);

  res.status(200).json(onSuccess({ name: data }, 'user/id', 'PUT'));
};

export const getCurrent = async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new ServerError({
      error: ERRORS.INTERNAL_SERVER_ERROR,
      operation: req.method as 'GET',
      status: 500,
      endpoint: 'user',
    });
  }

  // Return sanitized user data (public data only)
  const sanitized = {
    id: user.id,
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    role: user.role,
  };

  res.status(200).json(onSuccess(sanitized, 'user', 'GET'));
};

export default {
  getCurrent,
  updateOne,
};
