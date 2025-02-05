import { NextFunction, Request, Response } from 'express';
import signale from 'signale';

import UserModel from '../models/User';
import { ERRORS, sessionCookie } from '../modules/common';
import { ServerError } from '../modules/error';

export const userAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = sessionCookie.get(req);

  const user = await UserModel.findOne({
    session,
  });

  if (!user) {
    next(
      new ServerError({
        error: ERRORS.UNAUTHORIZED,
        status: 401,
        operation: req.method as 'GET',
      }),
    );

    return;
  }

  req.user = user;
  next();
};

export const adminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = sessionCookie.get(req);

  const user = await UserModel.findOne({
    session,
  });

  if (!user || user.role !== 'ADMIN') {
    next(
      new ServerError({
        error: ERRORS.UNAUTHORIZED,
        status: 401,
        operation: req.method as 'GET',
      }),
    );

    return;
  }

  req.user = user;
  next();
};
