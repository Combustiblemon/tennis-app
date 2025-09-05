# iOS Authentication Fixes

## Overview

This document outlines the fixes implemented to resolve iOS-specific authentication disconnection issues.

## Changes Made

### 1. Updated Cookie Configuration

- **File**: `src/modules/common.ts`
- **Changes**:
  - Added `sameSite: 'lax'` - Critical for iOS Safari compatibility
  - Changed `secure` flag to use `isProduction` instead of IP-based logic
  - Added optional `domain` configuration support
  - Updated `clearCookie` to match cookie settings

### 2. Added Session Refresh Endpoint

- **File**: `src/handlers/auth.ts`
- **New Endpoint**: `POST /auth/refresh`
- **Purpose**: Allows graceful session renewal without full re-login
- **Features**:
  - Validates existing session
  - Generates new session ID for security
  - Returns updated user data
  - Includes iOS-compatible headers

### 3. Enhanced Session Validation

- **File**: `src/middleware/auth.ts`
- **Improvements**:
  - Better error handling with specific error reasons
  - Added try-catch blocks for database operations
  - iOS-compatible headers on all authenticated requests
  - Detailed error responses for debugging

### 4. Updated CORS Configuration

- **File**: `src/index.ts`
- **Changes**:
  - Added `optionsSuccessStatus: 200` for iOS Safari
  - Added `exposedHeaders: ['set-cookie']` for cookie visibility
  - Added `preflightContinue: false` for better preflight handling

### 5. Added iOS-Specific Headers

- **Applied to**: Authentication endpoints and middleware
- **Headers**:
  - `Cache-Control: no-cache, no-store, must-revalidate`
  - `Pragma: no-cache`

## Environment Variables

Add these to your production environment:

```bash
# Required for production cookie security
PRODUCTION=true

# Optional: Set explicit cookie domain
COOKIE_DOMAIN=your-domain.com

# Existing variables (ensure they're set)
ALLOW_ORIGIN=your-frontend-domain.com
SECRET=your-cookie-secret
```

## Client-Side Recommendations

### 1. Implement Session Refresh

```javascript
// Call this periodically or when receiving 401 errors
const refreshSession = async () => {
  try {
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include' // Important for cookies
    });

    if (response.ok) {
      const data = await response.json();
      // Update user state with refreshed data
      return data;
    }
  } catch (error) {
    // Redirect to login
    window.location.href = '/login';
  }
};
```

### 2. Handle 401 Errors Gracefully

```javascript
// Intercept API responses
fetch('/api/endpoint', { credentials: 'include' })
  .then(response => {
    if (response.status === 401) {
      // Try to refresh session first
      return refreshSession().then(() => {
        // Retry original request
        return fetch('/api/endpoint', { credentials: 'include' });
      });
    }
    return response;
  });
```

### 3. Session Heartbeat (Optional)

```javascript
// Keep session alive during active usage
setInterval(() => {
  if (document.visibilityState === 'visible') {
    refreshSession();
  }
}, 15 * 60 * 1000); // Every 15 minutes
```

## Testing

### 1. Test on iOS Safari

- Verify cookies persist across app backgrounding
- Test session refresh functionality
- Confirm no unexpected logouts during normal usage

### 2. Test Cookie Behavior

```bash
# Check cookie headers in production
curl -i -X POST https://your-domain.com/auth/verifyLogin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","loginCode":"123456"}'
```

Look for:

- `Set-Cookie` header with `SameSite=lax`
- `Secure` flag in production
- Proper `Path` and `Domain` settings

## Common Issues & Solutions

### Issue: Cookies not persisting on iOS

**Solution**: Ensure `sameSite: 'lax'` and `secure: true` in production

### Issue: Session lost during app backgrounding

**Solution**: Implement session refresh and proper error handling

### Issue: CORS errors on iOS WebView

**Solution**: Verify CORS configuration includes iOS-specific settings

### Issue: Session expires too quickly

**Solution**: Use session refresh endpoint instead of extending session duration

## Monitoring

Add logging to monitor session-related issues:

```javascript
// In your error handler
if (error.data?.reason === 'invalid_session') {
  console.log('Session validation failed - iOS issue?');
  // Log device info, timestamp, etc.
}
```

## Security Considerations

1. **Session Refresh**: Generates new session ID on each refresh for security
2. **Error Information**: Provides specific error reasons for debugging without exposing sensitive data
3. **HTTPS Required**: Secure cookies only work over HTTPS in production
4. **Domain Restriction**: Cookie domain should match your application domain

## Performance Impact

- Minimal overhead from additional headers
- Session refresh reduces full re-authentication
- Better user experience on iOS devices
