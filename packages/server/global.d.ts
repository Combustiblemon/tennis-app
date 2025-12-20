import { User as ClerkUser } from '@clerk/express';
import { User } from './src/services/userService';

declare global {
  namespace Express {
    interface Request {
      user?: User | undefined;
      auth?: () => {
        userId: string | null;
        sessionId: string | null;
        orgId: string | null;
        orgRole: string | null;
        orgSlug: string | null;
        actor: any | null;
        claims: any;
        sessionClaims: any;
      };
      clerkUser?: ClerkUser | null;
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      CLERK_PUBLISHABLE_KEY: string;
      CLERK_SECRET_KEY: string;
      PRODUCTION?: string;
      PORT?: string;
      IP?: string;
      SECRET?: string;
      ALLOW_ORIGIN?: string;
      COOKIE_DOMAIN?: string;
    }
  }
}
