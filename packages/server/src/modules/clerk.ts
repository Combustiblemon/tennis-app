import { clerkMiddleware, createClerkClient } from '@clerk/express';
import signale from 'signale';

// Validate required environment variables
const validateClerkConfig = (): void => {
  const requiredVars = ['CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'];
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    signale.error(
      `Missing required Clerk environment variables: ${missing.join(', ')}`,
    );
    throw new Error('Clerk configuration incomplete');
  }
};

// Get Clerk secret key with type safety
const getClerkSecretKey = (): string => {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY environment variable is not set');
  }
  return secretKey;
};

// Initialize Clerk client
export const initClerk = (): boolean => {
  try {
    validateClerkConfig();
    signale.success('Clerk configuration validated');
    return true;
  } catch (error) {
    signale.error('Failed to initialize Clerk:', error);
    return false;
  }
};

// Create Clerk client instance for server-side operations
// This will throw if CLERK_SECRET_KEY is not set, which is intentional
export const clerkClient = createClerkClient({
  secretKey: getClerkSecretKey(),
});

// Clerk middleware for Express
// Note: iOS compatibility headers are set in the auth middleware (clerkAuth.ts)
export const clerkAuth = clerkMiddleware();

export default {
  initClerk,
  clerkClient,
  clerkAuth,
};
