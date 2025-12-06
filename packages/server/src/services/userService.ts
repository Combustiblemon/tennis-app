import { User as ClerkUser } from '@clerk/express';
import signale from 'signale';

import UserModel, { User } from '../models/User';
import { clerkClient } from '../modules/clerk';

/**
 * Service for managing user synchronization between Clerk and our database
 */
export class UserService {
  /**
   * Find or create a user based on Clerk user data
   */
  static async findOrCreateFromClerk(clerkUser: ClerkUser): Promise<User> {
    try {
      // First, try to find user by Clerk ID
      let user = await UserModel.findOne({ clerkId: clerkUser.id });

      if (user) {
        // Update user data if it exists
        return await this.updateFromClerk(user, clerkUser);
      }

      // If not found by Clerk ID, try to find by email for migration
      const primaryEmail = clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      );

      if (primaryEmail) {
        user = await UserModel.findOne({ email: primaryEmail.emailAddress });

        if (user) {
          // Link existing user with Clerk ID
          user.clerkId = clerkUser.id;
          user.accountType = 'CLERK';
          await user.save();
          signale.info(`Linked existing user ${user.email} with Clerk ID ${clerkUser.id}`);
          return user;
        }
      }

      // Create new user
      return await this.createFromClerk(clerkUser);
    } catch (error) {
      signale.error('Error in findOrCreateFromClerk:', error);
      throw error;
    }
  }

  /**
   * Create a new user from Clerk user data
   */
  static async createFromClerk(clerkUser: ClerkUser): Promise<User> {
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    );

    if (!primaryEmail) {
      throw new Error('No primary email found for Clerk user');
    }

    // Get role from Clerk metadata (default to USER)
    const role = (clerkUser.publicMetadata?.role as string) || 'USER';

    const userData = {
      clerkId: clerkUser.id,
      email: primaryEmail.emailAddress,
      firstname: clerkUser.firstName || '',
      lastname: clerkUser.lastName || '',
      role: ['ADMIN', 'USER', 'DEVELOPER'].includes(role) ? role : 'USER',
      accountType: 'CLERK' as const,
      FCMTokens: [],
    };

    const user = await UserModel.create(userData);
    signale.info(`Created new user from Clerk: ${user.email} (${user.clerkId})`);

    return user;
  }

  /**
   * Update existing user with Clerk data
   */
  static async updateFromClerk(user: User, clerkUser: ClerkUser): Promise<User> {
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    );

    if (primaryEmail) {
      user.email = primaryEmail.emailAddress;
    }

    user.firstname = clerkUser.firstName || user.firstname;
    user.lastname = clerkUser.lastName || user.lastname;

    // Update role from Clerk metadata if present
    const clerkRole = clerkUser.publicMetadata?.role as string;
    if (clerkRole && ['ADMIN', 'USER', 'DEVELOPER'].includes(clerkRole)) {
      user.role = clerkRole as 'ADMIN' | 'USER' | 'DEVELOPER';
    }

    await user.save();
    return user;
  }

  /**
   * Sync user role to Clerk metadata
   */
  static async syncRoleToClerk(userId: string, role: string): Promise<void> {
    try {
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          role,
        },
      });
      signale.info(`Synced role ${role} to Clerk for user ${userId}`);
    } catch (error) {
      signale.error(`Failed to sync role to Clerk for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user by Clerk ID
   */
  static async getByClerkId(clerkId: string): Promise<User | null> {
    return await UserModel.findOne({ clerkId });
  }

  /**
   * Migrate existing user to Clerk (for manual migration)
   */
  static async migrateUserToClerk(
    user: User,
    clerkId: string,
  ): Promise<User> {
    user.clerkId = clerkId;
    user.accountType = 'CLERK';

    // Clear legacy auth fields
    user.session = undefined;
    user.loginCode = undefined;
    user.password = undefined;
    user.resetKey = undefined;

    await user.save();

    // Sync role to Clerk
    await this.syncRoleToClerk(clerkId, user.role);

    signale.info(`Migrated user ${user.email} to Clerk (${clerkId})`);
    return user;
  }

  /**
   * Clean up legacy auth data for a user
   */
  static async cleanupLegacyAuth(user: User): Promise<User> {
    user.session = undefined;
    user.loginCode = undefined;
    user.password = undefined;
    user.resetKey = undefined;

    if (user.accountType !== 'CLERK') {
      user.accountType = 'CLERK';
    }

    await user.save();
    return user;
  }
}

export default UserService;
