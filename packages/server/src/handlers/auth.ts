import { randomInt } from 'node:crypto';

import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import signale from 'signale';
import { z } from 'zod';

import UserModel, { User } from '../models/User';
import {
  ERRORS,
  isProduction,
  onSuccess,
  sessionCookie,
} from '../modules/common';
import { ServerError } from '../modules/error';
import { subscribeUser } from '../modules/notifications';

const loginValidator = z.object({
  email: z.string().email(),
});

export const login = async (req: Request, res: Response) => {
  const result = loginValidator.safeParse(req.body);

  if (!result.success) {
    signale.error('Error parsing credentials', result.error);
    throw new ServerError({
      error: ERRORS.INVALID_CREDENTIALS,
      operation: req.method as 'GET',
      status: 400,
      endpoint: 'login',
    });
  }

  const data = result.data;

  const { email } = data;

  let user: User | null;

  try {
    user = await UserModel.findOne({
      email,
    });
  } catch (error) {
    signale.error('Error finding user', error);

    throw new ServerError({
      error: ERRORS.INTERNAL_SERVER_ERROR,
      operation: req.method as 'GET',
      status: 500,
      endpoint: 'login',
    });
  }

  if (!user) {
    user = await UserModel.create({
      name: '',
      email,
      role: 'USER',
      FCMTokens: [],
      session: '',
      accountType: 'EMAIL',
    });
  }

  signale.info('login started for: ', user.email);

  const loginCode = randomInt(1000000, 1999999).toString().substring(1, 7);

  user.loginCode = {
    code: loginCode,
    created: new Date(),
  };

  try {
    await user.save();

    return res.status(200).json(onSuccess({}, 'login'));
  } catch (err) {
    signale.error(err);

    throw new ServerError({
      error: ERRORS.INTERNAL_SERVER_ERROR,
      operation: req.method as 'GET',
      status: 500,
      endpoint: 'login',
    });
  }
};

const verifyLoginValidator = z.object({
  email: z.string().email(),
  FCMToken: z.string().optional(),
  loginCode: z.string().length(6),
});

export const verifyLogin = async (req: Request, res: Response) => {
  const result = verifyLoginValidator.safeParse(req.body);

  if (!result.success) {
    signale.error('Error parsing credentials', result.error);
    throw new ServerError({
      error: ERRORS.INVALID_CREDENTIALS,
      operation: req.method as 'GET',
      status: 400,
      endpoint: 'verifyLogin',
    });
  }

  const { email, FCMToken, loginCode } = result.data;

  let user: User | null;

  try {
    user = await UserModel.findOne({
      email,
    });
  } catch (error) {
    signale.error('Error finding user', error);

    throw new ServerError({
      error: ERRORS.INTERNAL_SERVER_ERROR,
      operation: req.method as 'GET',
      status: 500,
      endpoint: 'verifyLogin',
    });
  }

  if (!user) {
    throw new ServerError({
      error: ERRORS.LOGIN_ERROR,
      operation: req.method as 'GET',
      status: 400,
      endpoint: 'verifyLogin',
    });
  }

  if (isProduction && !user.compareLoginCode(loginCode)) {
    throw new ServerError({
      error: ERRORS.LOGIN_ERROR,
      operation: req.method as 'GET',
      status: 400,
      endpoint: 'verifyLogin',
    });
  }

  signale.info('User logged in', user.email);

  const session = nanoid();

  user.session = session;

  if (FCMToken && FCMToken !== 'undefined') {
    if (user.FCMTokens) {
      user.FCMTokens.push(FCMToken);
      user.FCMTokens = Array.from(new Set(user.FCMTokens));
    } else {
      user.FCMTokens = [FCMToken];
    }
  }

  if (FCMToken) {
    subscribeUser(user.role, [FCMToken]);
  }

  user.loginCode = undefined;

  sessionCookie.set(res, session);

  await user.save();

  return res.status(200).json(
    onSuccess(
      {
        name: user.name,
        email: user.email,
        role: user.role,
        _id: user._id.toString(),
        session,
      },
      'verifyLogin',
    ),
  );
};

export const logout = (req: Request, res: Response) => {
  sessionCookie.clear(res);

  res.status(200).json(onSuccess({}, 'logout'));
};
