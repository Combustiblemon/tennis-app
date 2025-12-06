# Authentication Configuration Guide

This guide explains how to configure the authentication system during the migration from custom auth to Clerk.

## Environment Variables

Add these to your `.env` file to control the authentication behavior:

### Required Clerk Variables
```env
CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
```

### Migration Control Variables (Optional)
```env
# Authentication Strategy
USE_CLERK_AUTH=false              # Use only Clerk auth (full migration)
USE_HYBRID_AUTH=true              # Support both Clerk and legacy (default)
ALLOW_LEGACY_AUTH=true            # Allow legacy session auth (default)

# Feature Flags
ENABLE_AUTO_USER_CREATION=true    # Auto-create users from Clerk (default)
ENABLE_USER_MIGRATION=true        # Allow linking existing users (default)
ENABLE_ROLE_SYNC=true             # Sync roles to Clerk metadata (default)

# Debug Options
LOG_AUTH_ATTEMPTS=true            # Log auth attempts (default in dev)
LOG_MIGRATION_STATUS=true         # Log migration status (default in dev)
```

## Migration Phases

### Phase 1: Hybrid Mode (Default)
```env
USE_HYBRID_AUTH=true
ALLOW_LEGACY_AUTH=true
```
- Supports both Clerk and legacy authentication
- Automatically creates/links users from Clerk
- Existing users continue to work with legacy auth
- New users can use Clerk authentication

### Phase 2: Clerk Only Mode
```env
USE_CLERK_AUTH=true
USE_HYBRID_AUTH=false
ALLOW_LEGACY_AUTH=false
```
- Only Clerk authentication is accepted
- All users must be migrated to Clerk
- Legacy auth endpoints can be removed

## Authentication Flow

### Hybrid Mode Flow
1. Check for Clerk authentication (`req.auth.userId`)
2. If found, use Clerk auth middleware
3. If not found, check for legacy session cookie
4. If found, use legacy auth middleware
5. If neither found, return 401 Unauthorized

### User Creation/Linking
- When a Clerk user logs in for the first time:
  1. System checks if user exists by Clerk ID
  2. If not found, checks by email for existing user
  3. If existing user found, links with Clerk ID
  4. If no existing user, creates new user from Clerk data
  5. Syncs role information between Clerk and database

## Configuration Examples

### Development Setup (Gradual Migration)
```env
USE_HYBRID_AUTH=true
ALLOW_LEGACY_AUTH=true
ENABLE_AUTO_USER_CREATION=true
ENABLE_USER_MIGRATION=true
LOG_AUTH_ATTEMPTS=true
LOG_MIGRATION_STATUS=true
```

### Production Setup (Full Migration)
```env
USE_CLERK_AUTH=true
USE_HYBRID_AUTH=false
ALLOW_LEGACY_AUTH=false
ENABLE_AUTO_USER_CREATION=true
ENABLE_ROLE_SYNC=true
LOG_AUTH_ATTEMPTS=false
LOG_MIGRATION_STATUS=false
```

### Testing Setup (Legacy Only)
```env
USE_CLERK_AUTH=false
USE_HYBRID_AUTH=false
ALLOW_LEGACY_AUTH=true
```

## Monitoring Migration

The system logs authentication attempts and migration status when enabled:

```
[INFO] User authenticated via Clerk: user@example.com (clerk_123)
[INFO] Linked existing user user@example.com with Clerk ID clerk_123
[INFO] Created new user from Clerk: newuser@example.com (clerk_456)
[WARN] User with Clerk ID clerk_789 not found in database
```

## Troubleshooting

### Common Issues

1. **"User not found" errors**
   - Enable `ENABLE_AUTO_USER_CREATION=true`
   - Run migration scripts to link existing users

2. **Authentication loops**
   - Check Clerk configuration in dashboard
   - Verify environment variables are set correctly

3. **Role sync issues**
   - Ensure `ENABLE_ROLE_SYNC=true`
   - Check Clerk user metadata configuration

### Debug Mode

Enable debug logging to troubleshoot issues:
```env
LOG_AUTH_ATTEMPTS=true
LOG_MIGRATION_STATUS=true
```

This will provide detailed logs about authentication attempts and user migration status.
