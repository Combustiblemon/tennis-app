import { clerkMiddleware, createClerkClient } from '@clerk/express';
import signale from 'signale';

// Validate required environment variables
const validateClerkConfig = () => {
  const requiredVars = ['CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    signale.error(`Missing required Clerk environment variables: ${missing.join(', ')}`);
    throw new Error('Clerk configuration incomplete');
  }
};

// Initialize Clerk client
export const initClerk = () => {
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
export const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Clerk middleware for Express
export const clerkAuth = clerkMiddleware({
  // Preserve iOS compatibility headers
  afterAuth: (auth, req, res) => {
    // Add iOS-specific headers for better compatibility
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  },
});

export default {
  initClerk,
  clerkClient,
  clerkAuth,
};
