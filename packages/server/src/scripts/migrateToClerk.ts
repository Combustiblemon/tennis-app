#!/usr/bin/env tsx

/**
 * Migration script to prepare existing users for Clerk authentication
 *
 * This script:
 * 1. Adds clerkId field to existing users (initially null)
 * 2. Updates accountType to 'CLERK' for users that will be migrated
 * 3. Provides utilities for manual user migration
 *
 * Usage:
 * - npm run migrate:clerk-prep - Prepare database for Clerk migration
 * - npm run migrate:clerk-link <email> <clerkId> - Link existing user with Clerk ID
 */

import signale from 'signale';

import UserModel from '../models/User';
import dbConnect from '../modules/dbConnect';
import UserService from '../services/userService';

async function prepareDatabase() {
  signale.info('Preparing database for Clerk migration...');

  try {
    await dbConnect();

    // Add clerkId index if it doesn't exist
    await UserModel.collection.createIndex(
      { clerkId: 1 },
      { unique: true, sparse: true }
    );

    signale.success('Database prepared for Clerk migration');
    signale.info('Next steps:');
    signale.info('1. Set up Clerk application and get API keys');
    signale.info('2. Configure environment variables');
    signale.info('3. Start migrating users using the link command');

  } catch (error) {
    signale.error('Error preparing database:', error);
    process.exit(1);
  }
}

async function linkUserWithClerk(email: string, clerkId: string) {
  signale.info(`Linking user ${email} with Clerk ID ${clerkId}...`);

  try {
    await dbConnect();

    const user = await UserModel.findOne({ email });
    if (!user) {
      signale.error(`User with email ${email} not found`);
      process.exit(1);
    }

    if (user.clerkId) {
      signale.warn(`User ${email} already has Clerk ID: ${user.clerkId}`);
      return;
    }

    await UserService.migrateUserToClerk(user, clerkId);
    signale.success(`Successfully linked ${email} with Clerk ID ${clerkId}`);

  } catch (error) {
    signale.error('Error linking user with Clerk:', error);
    process.exit(1);
  }
}

async function showMigrationStatus() {
  signale.info('Checking migration status...');

  try {
    await dbConnect();

    const totalUsers = await UserModel.countDocuments();
    const clerkUsers = await UserModel.countDocuments({ clerkId: { $exists: true, $ne: null } });
    const legacyUsers = totalUsers - clerkUsers;

    signale.info(`Total users: ${totalUsers}`);
    signale.info(`Migrated to Clerk: ${clerkUsers}`);
    signale.info(`Legacy users remaining: ${legacyUsers}`);

    if (legacyUsers > 0) {
      const legacyUsersList = await UserModel.find(
        { clerkId: { $exists: false } },
        { email: 1, role: 1, accountType: 1 }
      ).limit(10);

      signale.info('Sample legacy users:');
      legacyUsersList.forEach(user => {
        console.log(`  - ${user.email} (${user.role}, ${user.accountType})`);
      });

      if (legacyUsers > 10) {
        signale.info(`  ... and ${legacyUsers - 10} more`);
      }
    }

  } catch (error) {
    signale.error('Error checking migration status:', error);
    process.exit(1);
  }
}

async function cleanupLegacyData() {
  signale.info('Cleaning up legacy authentication data...');

  try {
    await dbConnect();

    const result = await UserModel.updateMany(
      { clerkId: { $exists: true, $ne: null } },
      {
        $unset: {
          session: 1,
          loginCode: 1,
          password: 1,
          resetKey: 1
        },
        $set: {
          accountType: 'CLERK'
        }
      }
    );

    signale.success(`Cleaned up legacy data for ${result.modifiedCount} users`);

  } catch (error) {
    signale.error('Error cleaning up legacy data:', error);
    process.exit(1);
  }
}

// Command line interface
const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (command) {
    case 'prep':
      await prepareDatabase();
      break;

    case 'link':
      if (args.length !== 2) {
        signale.error('Usage: npm run migrate:clerk-link <email> <clerkId>');
        process.exit(1);
      }
      await linkUserWithClerk(args[0], args[1]);
      break;

    case 'status':
      await showMigrationStatus();
      break;

    case 'cleanup':
      await cleanupLegacyData();
      break;

    default:
      signale.info('Available commands:');
      signale.info('  prep    - Prepare database for Clerk migration');
      signale.info('  link    - Link existing user with Clerk ID');
      signale.info('  status  - Show migration status');
      signale.info('  cleanup - Clean up legacy auth data for migrated users');
      break;
  }

  process.exit(0);
}

main().catch(error => {
  signale.error('Migration script error:', error);
  process.exit(1);
});
