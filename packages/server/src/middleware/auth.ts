import { NextFunction, Request, Response } from 'express';

import UserModel from '../models/User';
import { Errors, sessionCookie } from '../modules/common';

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
    next(Errors.UNAUTHORIZED);
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
    next(Errors.UNAUTHORIZED);
    return;
  }

  req.user = user;
  next();
};
