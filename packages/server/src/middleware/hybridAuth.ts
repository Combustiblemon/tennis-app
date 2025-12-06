import { NextFunction, Request, Response } from 'express';
import signale from 'signale';

import { ERRORS } from '../modules/common';
import { ServerError } from '../modules/error';
import { adminAuth as legacyAdminAuth, userAuth as legacyUserAuth } from './auth';
import { clerkAdminAuth, clerkUserAuth } from './clerkAuth';

/**
 * Hybrid authentication middleware that supports both legacy and Clerk auth
 * This allows for gradual migration from custom auth to Clerk
 */

/**
 * Hybrid user authentication - tries Clerk first, falls back to legacy
 */
export const hybridUserAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Check if user has Clerk authentication
  if (req.auth?.userId) {
    // Use Clerk authentication
    try {
      return clerkUserAuth[1](req, res, next);
    } catch (error) {
      signale.error('Clerk auth failed, falling back to legacy:', error);
    }
  }

  // Check if user has legacy session cookie
  const sessionCookie = req.cookies?.session;
  if (sessionCookie) {
    // Use legacy authentication
    try {
      return legacyUserAuth(req, res, next);
    } catch (error) {
      signale.error('Legacy auth failed:', error);
    }
  }

  // No authentication found
  return next(
    new ServerError({
      error: ERRORS.UNAUTHORIZED,
      status: 401,
      operation: req.method as 'GET',
      data: { reason: 'no_authentication_found' },
    }),
  );
};

/**
 * Hybrid admin authentication - tries Clerk first, falls back to legacy
 */
export const hybridAdminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Check if user has Clerk authentication
  if (req.auth?.userId) {
    // Use Clerk authentication
    try {
      return clerkAdminAuth[1](req, res, next);
    } catch (error) {
      signale.error('Clerk admin auth failed, falling back to legacy:', error);
    }
  }

  // Check if user has legacy session cookie
  const sessionCookie = req.cookies?.session;
  if (sessionCookie) {
    // Use legacy authentication
    try {
      return legacyAdminAuth(req, res, next);
    } catch (error) {
      signale.error('Legacy admin auth failed:', error);
    }
  }

  // No authentication found
  return next(
    new ServerError({
      error: ERRORS.UNAUTHORIZED,
      status: 401,
      operation: req.method as 'GET',
      data: { reason: 'no_admin_authentication_found' },
    }),
  );
};

/**
 * Migration status middleware - adds migration info to requests
 */
export const migrationStatus = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const hasClerkAuth = !!req.auth?.userId;
  const hasLegacyAuth = !!req.cookies?.session;

  // Add migration status to request for debugging/monitoring
  (req as any).authStatus = {
    hasClerkAuth,
    hasLegacyAuth,
    authType: hasClerkAuth ? 'clerk' : hasLegacyAuth ? 'legacy' : 'none',
  };

  next();
};
