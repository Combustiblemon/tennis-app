/**
 * Authentication configuration for migration control
 */

export interface AuthConfig {
  // Feature flags
  enableAutoUserCreation: boolean;
  enableUserMigration: boolean;
  enableRoleSync: boolean;

  // Debug options
  logAuthAttempts: boolean;
  logMigrationStatus: boolean;
}

// Default configuration based on environment
const getDefaultConfig = (): AuthConfig => {
  const isProduction = process.env.PRODUCTION?.toLowerCase() !== 'false';

  return {
    // Feature flags
    enableAutoUserCreation: process.env.ENABLE_AUTO_USER_CREATION !== 'false',
    enableUserMigration: process.env.ENABLE_USER_MIGRATION !== 'false',
    enableRoleSync: process.env.ENABLE_ROLE_SYNC !== 'false',

    // Debug options - more verbose in development
    logAuthAttempts: !isProduction || process.env.LOG_AUTH_ATTEMPTS === 'true',
    logMigrationStatus: !isProduction || process.env.LOG_MIGRATION_STATUS === 'true',
  };
};

export const authConfig = getDefaultConfig();

// Helper functions
export const canCreateUsers = () =>
  authConfig.enableAutoUserCreation;

export const canMigrateUsers = () =>
  authConfig.enableUserMigration;

export const shouldSyncRoles = () =>
  authConfig.enableRoleSync;
