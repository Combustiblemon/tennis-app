import { User as ClerkUser } from '@clerk/express';
import signale from 'signale';

import { clerkClient } from '../modules/clerk';

/**
 * Type for user data stored in Clerk publicMetadata (accessible to frontend)
 */
export type UserPublicMetadata = {
  role: 'ADMIN' | 'USER' | 'DEVELOPER';
};

/**
 * Type for user data stored in Clerk privateMetadata (backend only)
 */
export type UserPrivateMetadata = {
  FCMTokens?: string[];
};

/**
 * Combined user type for internal use
 */
export type User = {
  id: string; // Clerk userId
  email: string;
  firstname: string | null;
  lastname: string | null;
  role: 'ADMIN' | 'USER' | 'DEVELOPER';
  FCMTokens: string[];
};

/**
 * Service for managing user data in Clerk metadata
 */
export class UserService {
  /**
   * Get user data from Clerk user object
   */
  static async getUserFromClerk(clerkUser: ClerkUser): Promise<User> {
    const publicMetadata = (clerkUser.publicMetadata ||
      {}) as UserPublicMetadata;
    const privateMetadata = (clerkUser.privateMetadata ||
      {}) as UserPrivateMetadata;

    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    );

    return {
      id: clerkUser.id,
      email: primaryEmail?.emailAddress || '',
      firstname: clerkUser.firstName || null,
      lastname: clerkUser.lastName || null,
      role: publicMetadata.role || 'USER',
      FCMTokens: privateMetadata.FCMTokens || [],
    };
  }

  /**
   * Get user by Clerk ID
   * Automatically initializes metadata if it doesn't exist
   */
  static async getByClerkId(clerkId: string): Promise<User | null> {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const publicMetadata = (clerkUser.publicMetadata ||
        {}) as UserPublicMetadata;

      // If metadata doesn't have a role, initialize it
      if (!publicMetadata.role) {
        await this.initializeUserMetadata(clerkId);
        // Fetch the user again to get the updated metadata
        const updatedClerkUser = await clerkClient.users.getUser(clerkId);
        return await this.getUserFromClerk(updatedClerkUser);
      }

      return await this.getUserFromClerk(clerkUser);
    } catch (error) {
      signale.error(`Failed to get user ${clerkId} from Clerk:`, error);
      return null;
    }
  }

  /**
   * Initialize user metadata in Clerk (sets default role to USER and empty FCMTokens)
   * This should be called when a new user is created
   */
  static async initializeUserMetadata(clerkId: string): Promise<void> {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const publicMetadata = (clerkUser.publicMetadata ||
        {}) as UserPublicMetadata;
      const privateMetadata = (clerkUser.privateMetadata ||
        {}) as UserPrivateMetadata;

      const needsUpdate =
        !publicMetadata.role || privateMetadata.FCMTokens === undefined;

      // Initialize role and FCMTokens if they don't exist
      if (needsUpdate) {
        await clerkClient.users.updateUserMetadata(clerkId, {
          publicMetadata: {
            ...publicMetadata,
            role: publicMetadata.role || 'USER',
          },
          privateMetadata: {
            ...privateMetadata,
            FCMTokens: privateMetadata.FCMTokens || [],
          },
        });
        signale.info(
          `Initialized user metadata for ${clerkId} with role ${publicMetadata.role || 'USER'}`,
        );
      }
    } catch (error) {
      signale.error(
        `Failed to initialize user metadata for ${clerkId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update user role in Clerk publicMetadata
   */
  static async updateRole(
    clerkId: string,
    role: 'ADMIN' | 'USER' | 'DEVELOPER',
  ): Promise<void> {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const publicMetadata = (clerkUser.publicMetadata ||
        {}) as UserPublicMetadata;

      await clerkClient.users.updateUserMetadata(clerkId, {
        publicMetadata: {
          ...publicMetadata,
          role,
        },
      });
      signale.info(`Updated role for user ${clerkId} to ${role}`);
    } catch (error) {
      signale.error(`Failed to update role for user ${clerkId}:`, error);
      throw error;
    }
  }

  /**
   * Add FCM token to user's privateMetadata
   */
  static async addFCMToken(clerkId: string, token: string): Promise<boolean> {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const privateMetadata = (clerkUser.privateMetadata ||
        {}) as UserPrivateMetadata;
      const tokens = privateMetadata.FCMTokens || [];

      if (tokens.includes(token)) {
        return false; // Token already exists
      }

      await clerkClient.users.updateUserMetadata(clerkId, {
        privateMetadata: {
          ...privateMetadata,
          FCMTokens: [...tokens, token],
        },
      });
      signale.info(`Added FCM token for user ${clerkId}`);
      return true;
    } catch (error) {
      signale.error(`Failed to add FCM token for user ${clerkId}:`, error);
      return false;
    }
  }

  /**
   * Remove FCM token from user's privateMetadata
   */
  static async removeFCMToken(
    clerkId: string,
    token: string,
  ): Promise<boolean> {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const privateMetadata = (clerkUser.privateMetadata ||
        {}) as UserPrivateMetadata;
      const tokens = privateMetadata.FCMTokens || [];

      if (!tokens.includes(token)) {
        return false; // Token doesn't exist
      }

      await clerkClient.users.updateUserMetadata(clerkId, {
        privateMetadata: {
          ...privateMetadata,
          FCMTokens: tokens.filter((t) => t !== token),
        },
      });
      signale.info(`Removed FCM token for user ${clerkId}`);
      return true;
    } catch (error) {
      signale.error(`Failed to remove FCM token for user ${clerkId}:`, error);
      return false;
    }
  }

  /**
   * Get all users with a specific role
   */
  static async getUsersByRole(
    role: 'ADMIN' | 'USER' | 'DEVELOPER',
  ): Promise<User[]> {
    try {
      // Note: Clerk doesn't have a direct query by metadata, so we need to fetch all users
      // and filter. For better performance, consider using Clerk's user list API with pagination
      const users = await clerkClient.users.getUserList({ limit: 500 });
      const filteredUsers: User[] = [];

      for (const clerkUser of users.data) {
        const publicMetadata = (clerkUser.publicMetadata ||
          {}) as UserPublicMetadata;

        if (publicMetadata.role === role) {
          filteredUsers.push(await this.getUserFromClerk(clerkUser));
        }
      }

      return filteredUsers;
    } catch (error) {
      signale.error(`Failed to get users by role ${role}:`, error);
      return [];
    }
  }

  /**
   * Get all admin and developer users (for notifications)
   */
  static async getAdminUsers(): Promise<User[]> {
    try {
      const users = await clerkClient.users.getUserList({ limit: 500 });
      const adminUsers: User[] = [];

      for (const clerkUser of users.data) {
        const publicMetadata = (clerkUser.publicMetadata ||
          {}) as UserPublicMetadata;

        if (
          publicMetadata.role === 'ADMIN' ||
          publicMetadata.role === 'DEVELOPER'
        ) {
          adminUsers.push(await this.getUserFromClerk(clerkUser));
        }
      }

      return adminUsers;
    } catch (error) {
      signale.error('Failed to get admin users:', error);
      return [];
    }
  }

  /**
   * Update user's firstname and lastname (these are stored in Clerk's user object, not metadata)
   */
  static async updateName(
    clerkId: string,
    firstname: string,
    lastname: string,
  ): Promise<void> {
    try {
      await clerkClient.users.updateUser(clerkId, {
        firstName: firstname,
        lastName: lastname,
      });
      signale.info(`Updated name for user ${clerkId}`);
    } catch (error) {
      signale.error(`Failed to update name for user ${clerkId}:`, error);
      throw error;
    }
  }
}

export default UserService;
