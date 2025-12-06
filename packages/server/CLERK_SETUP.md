# Clerk Authentication Setup

This document outlines the setup and configuration for Clerk authentication in the tennis app server.

## Phase 1 Completed: Initial Setup

### What was installed:
- `@clerk/express` - Clerk SDK for Express.js
- Created Clerk configuration module
- Set up Clerk middleware in the main server
- Created new Clerk-based authentication middleware

### Files Modified:
- `package.json` - Added @clerk/express dependency
- `src/index.ts` - Integrated Clerk middleware
- `global.d.ts` - Added Clerk types to Express Request interface

### Files Created:
- `src/modules/clerk.ts` - Clerk configuration and client setup
- `src/middleware/clerkAuth.ts` - New Clerk-based auth middleware
- `.env.example` - Environment variables template
- `CLERK_SETUP.md` - This documentation file

## Required Environment Variables

Add these to your `.env` file:

```env
# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
```

## Clerk Dashboard Setup Required

1. **Create a Clerk Application:**
   - Go to [Clerk Dashboard](https://dashboard.clerk.com/)
   - Create a new application
   - Copy the Publishable Key and Secret Key

2. **Configure Authentication Methods:**
   - Enable Email authentication (to match current system)
   - Configure any additional providers as needed

3. **Set up User Metadata:**
   - Configure public metadata for user roles
   - Set up any custom fields needed

## Current Status

✅ **Completed:**
- Clerk SDK installation and basic configuration
- Clerk middleware integration
- New authentication middleware created
- Environment configuration template

⏳ **Next Steps (Remaining Phases):**
- Update User model to include Clerk ID
- Replace existing auth middleware usage
- Remove custom auth endpoints
- Set up user synchronization webhooks
- Test and validate the integration

## Important Notes

- The server will warn if Clerk environment variables are missing
- iOS compatibility headers are preserved in the new middleware
- The new middleware maintains the same error handling patterns
- User synchronization between Clerk and your database will be handled via webhooks

## Testing the Setup

1. Set the required environment variables
2. Start the server - it should initialize Clerk successfully
3. The server will log "Clerk configuration validated" on successful setup
4. If environment variables are missing, you'll see a warning but the server will still start

## Migration Strategy

The current setup allows for a gradual migration:
1. New Clerk middleware is available but not yet used
2. Existing custom auth system remains functional
3. Routes can be migrated one by one to use Clerk authentication
4. Old auth system can be removed once migration is complete
