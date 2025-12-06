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

      // Create new user - all new registrations get role 'USER'
      return await this.createFromClerk(clerkUser);
    } catch (error) {
      signale.error('Error in findOrCreateFromClerk:', error);
      throw error;
    }
  }

  /**
   * Create a new user from Clerk user data
   * All new registrations are created with role 'USER'
   */
  static async createFromClerk(clerkUser: ClerkUser): Promise<User> {
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    );

    if (!primaryEmail) {
      throw new Error('No primary email found for Clerk user');
    }

    const userData = {
      clerkId: clerkUser.id,
      email: primaryEmail.emailAddress,
      firstname: clerkUser.firstName || '',
      lastname: clerkUser.lastName || '',
      role: 'USER' as const, // All new registrations get role USER
      FCMTokens: [],
    };

    const user = await UserModel.create(userData);
    signale.info(`Created new user from Clerk: ${user.email} (${user.clerkId}) with role USER`);

    // Note: Sync to Clerk happens automatically via post-save hook

    return user;
  }

  /**
   * Update existing user with Clerk data
   * Note: Role is not updated from Clerk metadata - roles are managed separately
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

    // Role is not updated from Clerk - roles are managed in the database
    // Only update name and email from Clerk

    await user.save();
    return user;
  }

  /**
   * Get user by Clerk ID
   */
  static async getByClerkId(clerkId: string): Promise<User | null> {
    return await UserModel.findOne({ clerkId });
  }

  /**
   * Sync user role and FCMTokens to Clerk publicMetadata
   */
  static async syncToClerk(user: User): Promise<void> {
    if (!user.clerkId) {
      // User doesn't have a Clerk ID yet, skip sync
      return;
    }

    try {
      await clerkClient.users.updateUserMetadata(user.clerkId, {
        publicMetadata: {
          role: user.role,
          FCMTokens: user.FCMTokens || [],
        },
      });
      signale.debug(
        `Synced role and FCMTokens to Clerk for user ${user.email} (${user.clerkId})`,
      );
    } catch (error) {
      signale.error(
        `Failed to sync to Clerk for user ${user.email} (${user.clerkId}):`,
        error,
      );
      // Don't throw - sync failure shouldn't break user operations
    }
  }
}

export default UserService;
