import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import signale from 'signale';
import { z } from 'zod';

import UserModel, { Users, UserSanitized } from '../models/User';
import { Errors, onError, onSuccess } from '../modules/common';
import { subscribeUser } from '../modules/notifications';

const registerValidator = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().max(60),
  FCMToken: z.string().optional(),
});

const loginValidator = registerValidator.pick({
  email: true,
  password: true,
  FCMToken: true,
});

export const login = async (req: Request, res: Response) => {
  const result = loginValidator.safeParse(req.body);

  if (!result.success) {
    signale.error('Error parsing credentials', result.error);
    return res
      .status(400)
      .json(onError(new Error(Errors.INVALID_CREDENTIALS), 'login'));
  }

  const data = result.data;

  const { email, FCMToken, password } = data;

  let user: Users | null;

  try {
    user = await UserModel.findOne({
      email,
    });
  } catch (error) {
    signale.error('Error finding user', error);

    return res
      .status(500)
      .json(onError(new Error(Errors.INTERNAL_SERVER_ERROR), 'login'));
  }

  if (!user) {
    return res
      .status(400)
      .json(onError(new Error(Errors.LOGIN_ERROR), 'login'));
  }

  const passwordMatch = user.comparePasswords(password);

  if (!passwordMatch) {
    return res
      .status(400)
      .json(onError(new Error(Errors.LOGIN_ERROR), 'login'));
  }

  signale.info('User logged in', user.email);

  try {
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

    await user.save();

    onSuccess(
      {
        name: user.name,
        email: user.email,
        role: user.role,
        _id: user._id as string,
        FCMToken: FCMToken || '',
        session,
      },
      'login',
      'POST',
    );
  } catch (err) {
    signale.error(err);

    return res
      .status(500)
      .json(onError(new Error(Errors.INTERNAL_SERVER_ERROR), 'login'));
  }
};

export const register = async (req: Request, res: Response) => {
  const result = registerValidator.safeParse(req.body);

  if (!result.success) {
    signale.error('Register: Error parsing credentials', result.error);
    throw new Error(Errors.INVALID_CREDENTIALS);
  }

  const data = result.data;

  const { email, FCMToken, name, password } = data;

  let userExists: boolean;

  try {
    userExists = Boolean(await UserModel.exists({ email }));
  } catch (error) {
    signale.error('Error checking if user exists', error);

    res
      .status(500)
      .json(onError(new Error('internal server error'), 'register'));
    return;
  }

  if (userExists) {
    throw new Error(Errors.USER_EXISTS);
  }

  let user: UserSanitized;
  const session = nanoid();

  try {
    user = (
      await UserModel.create({
        name,
        email,
        password,
        role: 'USER',
        FCMTokens: [FCMToken],
        session,
        accountType: 'PASSWORD',
      })
    ).sanitize();
  } catch (error) {
    signale.error('Error creating user', error);

    res
      .status(500)
      .json(onError(new Error(Errors.INTERNAL_SERVER_ERROR), 'register'));

    return;
  }

  signale.info('User created', user.email);

  // If no error and we have user data, return it
  if (user) {
    if (FCMToken) {
      subscribeUser(user.role, [FCMToken]);
    }

    return {
      name: user.name,
      email: user.email,
      role: user.role,
      _id: user._id as string,
      FCMToken: FCMToken || '',
      session,
    };
  }
};
