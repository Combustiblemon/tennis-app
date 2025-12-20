import { requireAuth } from '@clerk/express';
import { NextFunction, Request, Response } from 'express';
import signale from 'signale';

import { ERRORS } from '../modules/common';
import { ServerError } from '../modules/error';
import UserService from '../services/userService';

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

      const { userId } = req.auth?.() || { userId: null };

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

      // Get user from Clerk (this will automatically initialize metadata if needed)
      const user = await UserService.getByClerkId(userId);

      if (!user) {
        return next(
          new ServerError({
            error: ERRORS.USER_NOT_FOUND,
            status: 404,
            operation: req.method as 'GET',
            data: { reason: 'user_not_found' },
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

      const { userId } = req.auth?.() || { userId: null };

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

      // Get user from Clerk (this will automatically initialize metadata if needed)
      const user = await UserService.getByClerkId(userId);

      if (!user) {
        return next(
          new ServerError({
            error: ERRORS.USER_NOT_FOUND,
            status: 404,
            operation: req.method as 'GET',
            data: { reason: 'user_not_found' },
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
    const auth = req.auth?.();
    const { userId } = auth || {};

    if (userId) {
      // Get user from Clerk (this will automatically initialize metadata if needed)
      const user = await UserService.getByClerkId(userId);

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
