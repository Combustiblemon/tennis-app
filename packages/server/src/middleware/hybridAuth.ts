import { NextFunction, Request, Response } from 'express';

/**
 * Authentication status tracking middleware
 * Tracks authentication status for monitoring and debugging
 */
export const migrationStatus = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const hasClerkAuth = !!req.auth?.()?.userId;

  // Add authentication status to request for debugging/monitoring
  (req as any).authStatus = {
    hasClerkAuth,
    authType: hasClerkAuth ? 'clerk' : 'none',
  };

  next();
};
