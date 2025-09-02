import { NextFunction, Request, Response } from 'express';

import UserModel from '../models/User';
import { ERRORS, sessionCookie } from '../modules/common';
import { ServerError } from '../modules/error';

export const userAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = sessionCookie.get(req);

  // Add iOS-specific headers for better compatibility
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  if (!session) {
    next(
      new ServerError({
        error: ERRORS.UNAUTHORIZED,
        status: 401,
        operation: req.method as 'GET',
        data: { reason: 'missing_session' },
      }),
    );
    return;
  }

  try {
    const user = await UserModel.findOne({
      session,
    });

    if (!user) {
      next(
        new ServerError({
          error: ERRORS.UNAUTHORIZED,
          status: 401,
          operation: req.method as 'GET',
          data: { reason: 'invalid_session' },
        }),
      );
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(
      new ServerError({
        error: ERRORS.INTERNAL_SERVER_ERROR,
        status: 500,
        operation: req.method as 'GET',
        data: { reason: 'session_validation_error' },
      }),
    );
  }
};

export const adminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = sessionCookie.get(req);

  // Add iOS-specific headers for better compatibility
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  if (!session) {
    next(
      new ServerError({
        error: ERRORS.UNAUTHORIZED,
        status: 401,
        operation: req.method as 'GET',
        data: { reason: 'missing_session' },
      }),
    );
    return;
  }

  try {
    const user = await UserModel.findOne({
      session,
    });

    if (!user) {
      next(
        new ServerError({
          error: ERRORS.UNAUTHORIZED,
          status: 401,
          operation: req.method as 'GET',
          data: { reason: 'invalid_session' },
        }),
      );
      return;
    }

    if (user.role !== 'ADMIN' && user.role !== 'DEVELOPER') {
      next(
        new ServerError({
          error: ERRORS.UNAUTHORIZED,
          status: 401,
          operation: req.method as 'GET',
          data: { reason: 'insufficient_privileges' },
        }),
      );
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(
      new ServerError({
        error: ERRORS.INTERNAL_SERVER_ERROR,
        status: 500,
        operation: req.method as 'GET',
        data: { reason: 'session_validation_error' },
      }),
    );
  }
};
