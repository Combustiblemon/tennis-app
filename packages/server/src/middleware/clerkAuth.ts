import { requireAuth } from '@clerk/express';
import { NextFunction, Request, Response } from 'express';
import signale from 'signale';

import UserModel from '../models/User';
import { ERRORS } from '../modules/common';
import { ServerError } from '../modules/error';

/**
 * Clerk-based user authentication middleware
 * Replaces the custom userAuth middleware
 */
export const clerkUserAuth = [
  requireAuth(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Add iOS-specific headers for better compatibility
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');

      const { userId } = req.auth!;

      if (!userId) {
        return next(
          new ServerError({
            error: ERRORS.UNAUTHORIZED,
            status: 401,
            operation: req.method as 'GET',
            data: { reason: 'missing_clerk_user_id' },
          }),
        );
      }

      // Find or create user in our database based on Clerk ID
      let user = await UserModel.findOne({ clerkId: userId });

      if (!user) {
        // If user doesn't exist in our DB, we'll handle this in the webhook
        // For now, we'll create a basic user record
        signale.warn(`User with Clerk ID ${userId} not found in database`);
        return next(
          new ServerError({
            error: ERRORS.USER_NOT_FOUND,
            status: 404,
            operation: req.method as 'GET',
            data: { reason: 'user_not_synced' },
          }),
        );
      }

      req.user = user;
      next();
    } catch (error) {
      signale.error('Error in Clerk user auth middleware:', error);
      next(
        new ServerError({
          error: ERRORS.INTERNAL_SERVER_ERROR,
          status: 500,
          operation: req.method as 'GET',
          data: { reason: 'clerk_auth_error' },
        }),
      );
    }
  },
];

/**
 * Clerk-based admin authentication middleware
 * Replaces the custom adminAuth middleware
 */
export const clerkAdminAuth = [
  requireAuth(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Add iOS-specific headers for better compatibility
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');

      const { userId } = req.auth!;

      if (!userId) {
        return next(
          new ServerError({
            error: ERRORS.UNAUTHORIZED,
            status: 401,
            operation: req.method as 'GET',
            data: { reason: 'missing_clerk_user_id' },
          }),
        );
      }

      // Find user in our database
      const user = await UserModel.findOne({ clerkId: userId });

      if (!user) {
        signale.warn(`Admin user with Clerk ID ${userId} not found in database`);
        return next(
          new ServerError({
            error: ERRORS.USER_NOT_FOUND,
            status: 404,
            operation: req.method as 'GET',
            data: { reason: 'admin_user_not_synced' },
          }),
        );
      }

      // Check if user has admin privileges
      if (user.role !== 'ADMIN' && user.role !== 'DEVELOPER') {
        return next(
          new ServerError({
            error: ERRORS.UNAUTHORIZED,
            status: 401,
            operation: req.method as 'GET',
            data: { reason: 'insufficient_privileges' },
          }),
        );
      }

      req.user = user;
      next();
    } catch (error) {
      signale.error('Error in Clerk admin auth middleware:', error);
      next(
        new ServerError({
          error: ERRORS.INTERNAL_SERVER_ERROR,
          status: 500,
          operation: req.method as 'GET',
          data: { reason: 'clerk_admin_auth_error' },
        }),
      );
    }
  },
];

/**
 * Optional authentication middleware - doesn't require authentication but adds user if available
 * Useful for endpoints that work for both authenticated and unauthenticated users
 */
export const clerkOptionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId } = req.auth || {};

    if (userId) {
      const user = await UserModel.findOne({ clerkId: userId });
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    signale.error('Error in Clerk optional auth middleware:', error);
    // Don't fail the request for optional auth errors
    next();
  }
};
