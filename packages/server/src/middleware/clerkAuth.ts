import { NextFunction, Request, Response } from 'express';
import signale from 'signale';

import { authConfig } from '../config/authConfig';
import { ERRORS } from '../modules/common';
import { ServerError } from '../modules/error';
import UserService from '../services/userService';

/**
 * Clerk-based user authentication middleware
 * Replaces the custom userAuth middleware
 * Note: We don't use requireAuth() here because it redirects, which causes
 * redirect loops in API endpoints. Instead, we manually check auth and return 401.
 */
export const clerkUserAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Add iOS-specific headers for better compatibility
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    // Debug logging for auth issues
    const auth = req.auth?.();
    const { userId } = auth || { userId: null };

    // Check Authorization header format
    const authHeader = req.headers.authorization;
    const hasBearerToken = authHeader && authHeader.startsWith('Bearer ');

    if (authConfig.logAuthAttempts) {
      signale.debug('Auth check:', {
        hasAuth: !!auth,
        userId,
        hasBearerToken,
        authObjectKeys: auth ? Object.keys(auth) : [],
        headers: {
          authorization: authHeader
            ? hasBearerToken
              ? 'Bearer token present'
              : 'Invalid format'
            : 'missing',
          cookie: req.headers.cookie ? 'present' : 'missing',
        },
      });
    }

    // If userId is not found from middleware, try to extract from JWT token manually
    let verifiedUserId = userId;
    let jwtPayload: {
      sub?: string;
      email?: string;
      first_name?: string;
      firstName?: string;
      last_name?: string;
      lastName?: string;
      public_metadata?: { role?: string };
    } | null = null;

    if (!verifiedUserId && hasBearerToken) {
      try {
        const token = authHeader.replace('Bearer ', '');
        // Decode JWT to extract userId (sub claim)
        // JWT format: header.payload.signature
        const parts = token.split('.');

        if (parts.length === 3) {
          // Decode the payload (base64url)
          jwtPayload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf-8'),
          );
          verifiedUserId = jwtPayload?.sub || null; // sub is the user ID in JWT

          if (authConfig.logAuthAttempts) {
            signale.info(
              'Extracted userId from JWT token manually:',
              verifiedUserId,
            );
          }
        }
      } catch (decodeError) {
        if (authConfig.logAuthAttempts) {
          signale.error('Failed to decode JWT token:', decodeError);
        }
      }
    }

    if (!verifiedUserId) {
      if (authConfig.logAuthAttempts) {
        signale.warn('Unauthorized request - no userId found', {
          path: req.path,
          method: req.method,
          hasAuthHeader: !!authHeader,
          hasBearerToken,
          authObject: auth,
          authObjectType: typeof auth,
          // Log the actual token (first 50 chars for debugging)
          tokenPreview: hasBearerToken
            ? authHeader.substring(0, 50) + '...'
            : 'none',
        });
      }

      // Provide helpful error message based on what's missing
      const errorReason = !authHeader
        ? 'missing_authorization_header'
        : !hasBearerToken
          ? 'invalid_token_format'
          : 'missing_clerk_user_id';

      return next(
        new ServerError({
          error: ERRORS.UNAUTHORIZED,
          status: 401,
          operation: req.method as 'GET',
          data: {
            reason: errorReason,
            message: !authHeader
              ? 'Authorization header is missing. Please include: Authorization: Bearer <token>'
              : !hasBearerToken
                ? 'Invalid token format. Expected: Authorization: Bearer <token>'
                : 'Invalid or expired Clerk session token',
          },
        }),
      );
    }

    // Get user from Clerk (this will automatically initialize metadata if needed)
    // verifiedUserId is guaranteed to be non-null here due to the check above
    if (!verifiedUserId) {
      throw new Error('verifiedUserId should not be null at this point');
    }

    let user = await UserService.getByClerkId(verifiedUserId);

    // If user doesn't exist in Clerk but we have a valid JWT, create a minimal user object
    // This can happen if the user was deleted or there's an environment mismatch
    if (!user && jwtPayload) {
      if (authConfig.logAuthAttempts) {
        signale.warn(
          `User ${verifiedUserId} not found in Clerk, creating from JWT data`,
        );
      }

      // Create a minimal user object from JWT payload
      // Note: JWT session tokens may not contain all user info
      user = {
        id: verifiedUserId,
        email: jwtPayload.email || '',
        firstname: jwtPayload.first_name || jwtPayload.firstName || null,
        lastname: jwtPayload.last_name || jwtPayload.lastName || null,
        role:
          (jwtPayload.public_metadata?.role as
            | 'ADMIN'
            | 'USER'
            | 'DEVELOPER') || 'USER',
        FCMTokens: [],
      };

      // Try to initialize the user in Clerk if auto-creation is enabled
      if (authConfig.enableAutoUserCreation) {
        try {
          await UserService.initializeUserMetadata(verifiedUserId);

          // Try to fetch again after initialization
          const fetchedUser = await UserService.getByClerkId(verifiedUserId);

          if (fetchedUser) {
            user = fetchedUser;
          }
        } catch (initError) {
          if (authConfig.logAuthAttempts) {
            signale.warn(
              'Failed to initialize user in Clerk, using JWT data:',
              initError,
            );
          }
        }
      }
    }

    if (!user) {
      return next(
        new ServerError({
          error: ERRORS.USER_NOT_FOUND,
          status: 404,
          operation: req.method as 'GET',
          data: {
            reason: 'user_not_found',
            message:
              'User not found in Clerk. The JWT token may be from a different environment or the user may have been deleted.',
          },
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
};

/**
 * Clerk-based admin authentication middleware
 * Replaces the custom adminAuth middleware
 * Note: We don't use requireAuth() here because it redirects, which causes
 * redirect loops in API endpoints. Instead, we manually check auth and return 401.
 */
export const clerkAdminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Add iOS-specific headers for better compatibility
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    const auth = req.auth?.();
    const { userId } = auth || { userId: null };

    // Check Authorization header format
    const authHeader = req.headers.authorization;
    const hasBearerToken = authHeader && authHeader.startsWith('Bearer ');

    // If userId is not found from middleware, try to extract from JWT token manually
    let verifiedUserId = userId;
    let jwtPayload: {
      sub?: string;
      email?: string;
      first_name?: string;
      firstName?: string;
      last_name?: string;
      lastName?: string;
      public_metadata?: { role?: string };
    } | null = null;

    if (!verifiedUserId && hasBearerToken) {
      try {
        const token = authHeader.replace('Bearer ', '');
        // Decode JWT to extract userId (sub claim)
        // JWT format: header.payload.signature
        const parts = token.split('.');

        if (parts.length === 3) {
          // Decode the payload (base64url)
          jwtPayload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf-8'),
          );
          verifiedUserId = jwtPayload?.sub || null; // sub is the user ID in JWT

          if (authConfig.logAuthAttempts) {
            signale.info(
              'Extracted userId from JWT token manually (admin):',
              verifiedUserId,
            );
          }
        }
      } catch (decodeError) {
        if (authConfig.logAuthAttempts) {
          signale.error('Failed to decode JWT token (admin):', decodeError);
        }
      }
    }

    if (!verifiedUserId) {
      if (authConfig.logAuthAttempts) {
        signale.warn('Admin auth failed - no userId found', {
          path: req.path,
          method: req.method,
          hasAuthHeader: !!authHeader,
          hasBearerToken,
        });
      }

      const errorReason = !authHeader
        ? 'missing_authorization_header'
        : !hasBearerToken
          ? 'invalid_token_format'
          : 'missing_clerk_user_id';

      return next(
        new ServerError({
          error: ERRORS.UNAUTHORIZED,
          status: 401,
          operation: req.method as 'GET',
          data: {
            reason: errorReason,
            message: !authHeader
              ? 'Authorization header is missing. Please include: Authorization: Bearer <token>'
              : !hasBearerToken
                ? 'Invalid token format. Expected: Authorization: Bearer <token>'
                : 'Invalid or expired Clerk session token',
          },
        }),
      );
    }

    // Get user from Clerk (this will automatically initialize metadata if needed)
    // verifiedUserId is guaranteed to be non-null here due to the check above
    if (!verifiedUserId) {
      throw new Error('verifiedUserId should not be null at this point');
    }

    let user = await UserService.getByClerkId(verifiedUserId);

    // If user doesn't exist in Clerk but we have a valid JWT, create a minimal user object
    if (!user && jwtPayload) {
      if (authConfig.logAuthAttempts) {
        signale.warn(
          `User ${verifiedUserId} not found in Clerk (admin), creating from JWT data`,
        );
      }

      // Create a minimal user object from JWT payload
      user = {
        id: verifiedUserId,
        email: jwtPayload.email || '',
        firstname: jwtPayload.first_name || jwtPayload.firstName || null,
        lastname: jwtPayload.last_name || jwtPayload.lastName || null,
        role:
          (jwtPayload.public_metadata?.role as
            | 'ADMIN'
            | 'USER'
            | 'DEVELOPER') || 'USER',
        FCMTokens: [],
      };

      // Try to initialize the user in Clerk if auto-creation is enabled
      if (authConfig.enableAutoUserCreation) {
        try {
          await UserService.initializeUserMetadata(verifiedUserId);

          const fetchedUser = await UserService.getByClerkId(verifiedUserId);

          if (fetchedUser) {
            user = fetchedUser;
          }
        } catch (initError) {
          if (authConfig.logAuthAttempts) {
            signale.warn(
              'Failed to initialize user in Clerk (admin), using JWT data:',
              initError,
            );
          }
        }
      }
    }

    if (!user) {
      return next(
        new ServerError({
          error: ERRORS.USER_NOT_FOUND,
          status: 404,
          operation: req.method as 'GET',
          data: {
            reason: 'user_not_found',
            message:
              'User not found in Clerk. The JWT token may be from a different environment or the user may have been deleted.',
          },
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
};

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
