# Clerk Authentication Setup

This document outlines the setup and configuration for Clerk authentication in the tennis app server.

## Phase 1 Completed: Initial Setup

### What was installed:
- `@clerk/express` - Clerk SDK for Express.js
- Created Clerk configuration module
- Set up Clerk middleware in the main server
- Created new Clerk-based authentication middleware

### Files Modified:
- `package.json` - Added @clerk/express dependency and migration scripts
- `src/index.ts` - Integrated Clerk middleware and configuration logging
- `global.d.ts` - Added Clerk types to Express Request interface
- `src/models/User.ts` - Added clerkId field and updated schema
- `src/modules/common.ts` - Enhanced auth helper functions
- `src/modules/routes.ts` - Updated to use configurable auth strategies

### Files Created:
- `src/modules/clerk.ts` - Clerk configuration and client setup
- `src/middleware/clerkAuth.ts` - New Clerk-based auth middleware
- `src/middleware/hybridAuth.ts` - Hybrid auth for gradual migration
- `src/services/userService.ts` - User synchronization service
- `src/scripts/migrateToClerk.ts` - Database migration utilities
- `src/config/authConfig.ts` - Authentication configuration system
- `AUTH_CONFIG.md` - Configuration guide
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

✅ **Phase 1 Completed:**
- Clerk SDK installation and basic configuration
- Clerk middleware integration
- New authentication middleware created
- Environment configuration template

✅ **Phase 2 Completed:**
- Updated User model with Clerk ID field
- Created UserService for Clerk user synchronization
- Enhanced authentication middleware with auto user creation
- Added database migration scripts
- Updated helper functions for Clerk compatibility

✅ **Phase 3 Completed:**
- Replaced auth middleware in all protected routes
- Created hybrid authentication system for gradual migration
- Added configurable authentication strategies
- Implemented startup configuration logging
- Created comprehensive configuration documentation

✅ **Phase 4 Completed:**
- Removed all legacy auth endpoints (`/auth/login`, `/auth/verifyLogin`, `/auth/refresh`, `/auth/logout`)
- Deleted legacy auth handler file
- Removed hybrid auth fallback logic
- Simplified configuration to Clerk-only mode
- Updated documentation to reflect changes

⏳ **Next Steps (Remaining Phases):**
- Set up user synchronization webhooks (optional - auto-creation already works)
- Clean up remaining legacy auth code and dependencies
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

## Migration Status

✅ **Migration Complete:**
1. ✅ Clerk middleware is fully integrated
2. ✅ User model supports Clerk authentication
3. ✅ Database migration scripts are available
4. ✅ All routes use Clerk authentication
5. ✅ Legacy auth system has been completely removed

## Database Migration Commands

```bash
# Prepare database for Clerk migration
npm run migrate:clerk-prep

# Check migration status
npm run migrate:clerk-status

# Link existing user with Clerk ID (manual)
npm run migrate:clerk-link user@example.com clerk_user_id

# Clean up legacy auth data for migrated users
npm run migrate:clerk-cleanup
```

## User Synchronization

The system now automatically:
- Creates new users from Clerk authentication
- Links existing users by email during first Clerk login
- Syncs user roles between Clerk metadata and database
- Maintains FCM tokens and other app-specific data
