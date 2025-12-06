import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import signale from 'signale';

import { authConfig } from './config/authConfig';
import { isProduction } from './modules/common';
import { clerkAuth, initClerk } from './modules/clerk';
import dbConnect from './modules/dbConnect';
import { initEmailClient } from './modules/email';
import { errorHandler } from './modules/error';
import { initFirebaseApp } from './modules/notifications';
import { setupRoutes } from './modules/routes';

const app = express();

// Initialize services
initEmailClient();
await dbConnect();
initFirebaseApp();

// Initialize and configure authentication
const logAuthConfig = () => {
  signale.info('🔐 Authentication Configuration:');
  signale.success('  Mode: Clerk Authentication Only');
  signale.info(`  Auto user creation: ${authConfig.enableAutoUserCreation ? '✅' : '❌'}`);
  signale.info(`  User migration: ${authConfig.enableUserMigration ? '✅' : '❌'}`);
  signale.info(`  Role sync: ${authConfig.enableRoleSync ? '✅' : '❌'}`);

  if (authConfig.logAuthAttempts || authConfig.logMigrationStatus) {
    signale.info(`  Debug logging: ✅ Enabled`);
  }
};

// Initialize Clerk - required for authentication
if (!initClerk()) {
  signale.error('Clerk initialization failed - server cannot start without authentication');
  process.exit(1);
}

logAuthConfig();

const findOrigin = (origin: string) =>
  new RegExp(/(?<=https:\/\/).*?(?=\/)/, '').exec(origin)?.[0] || '';

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        !process.env.ALLOW_ORIGIN ||
        process.env.ALLOW_ORIGIN?.includes(findOrigin(origin)) ||
        !isProduction
      ) {
        callback(null, true);
      } else {
        signale.info('cors error, origin: ', origin, findOrigin(origin));
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    // iOS Safari compatibility
    optionsSuccessStatus: 200,
    preflightContinue: false,
    exposedHeaders: ['set-cookie'],
  }),
);

app.use(express.json({ limit: '5mb' }));

app.use(compression());
app.use(cookieParser(process.env.SECRET));

// Add Clerk middleware
app.use(clerkAuth);

setupRoutes(app);

app.use(errorHandler);

const port = process.env.PORT || 2000;
const ip = process.env.IP || 'localhost';

const server = app.listen(port, () => {
  signale.info(`Listening at http://${ip}:${port}/`);
});

server.on('error', signale.error);
