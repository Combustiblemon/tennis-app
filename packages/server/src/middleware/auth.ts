/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express';

import UserModel from '../models/User';
import { ERRORS, onError, sessionCookie } from '../modules/common';
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
    throw new ServerError({
      error: ERRORS.UNAUTHORIZED,
      status: 400,
      operation: req.method as 'GET',
    });
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
    throw new ServerError({
      error: ERRORS.UNAUTHORIZED,
      status: 400,
      operation: req.method as 'GET',
    });
  }

  req.user = user;
  next();
};
