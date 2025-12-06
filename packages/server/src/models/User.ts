import bcrypt from 'bcryptjs';
import mongoose, { Model, Types } from 'mongoose';
import z from 'zod';

// 10 minutes - keeping for backward compatibility during migration
const LOGIN_CODE_LIFETIME = 10 * 60 * 1000;

export const UserValidator = z.object({
  clerkId: z.string().optional(), // Clerk user ID for new auth system
  role: z.enum(['ADMIN', 'USER', 'DEVELOPER']).default('USER'),
  email: z.string().email(),
  // Legacy fields - will be removed after migration
  password: z.string().min(6).optional(),
  accountType: z.enum(['GOOGLE', 'PASSWORD', 'EMAIL', 'CLERK']).optional(),
  firstname: z.string().max(60).optional(),
  lastname: z.string().max(60).optional(),
});

type SanitizedUserFields =
  | 'firstname'
  | 'lastname'
  | 'email'
  | 'role'
  | '_id'
  | 'clerkId'
  | 'FCMTokens';

export type UserDataType = z.infer<typeof UserValidator>;

export type UserSanitized = Pick<User, SanitizedUserFields>;

export type User = mongoose.Document &
  z.infer<typeof UserValidator> & {
    _id: Types.ObjectId;
    clerkId?: string; // Clerk user ID for linking accounts
    // Legacy fields - will be removed after migration
    resetKey?: {
      value: string;
      expiresAt: Date;
    };
    FCMTokens?: Array<string>;
    session?: string;
    loginCode?: {
      code: string;
      created: Date;
    };
    // Legacy methods - will be removed after migration
    comparePasswords: (candidatePassword?: string) => boolean;
    compareResetKey: (resetKey?: string) => boolean;
    compareSessions: (session?: string) => boolean;
    compareLoginCode: (code?: string) => boolean;
    // Current methods
    sanitize: () => UserSanitized;
    addToken: (token: string) => boolean;
    removeToken: (token: string) => boolean;
  };

export const UserSchema = new mongoose.Schema<User>({
  // Clerk integration
  clerkId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness
    index: true, // Index for fast lookups
  },
  // Core user fields
  firstname: {
    type: String,
  },
  lastname: {
    type: String,
  },
  role: {
    type: String,
    enum: ['ADMIN', 'USER', 'DEVELOPER'],
    default: 'USER',
  },
  email: {
    type: String,
    unique: true,
    required: [true, 'Please add a User email'],
    validate: {
      validator(v: string) {
        // check if email is valid
        // eslint-disable-next-line no-useless-escape
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: (props) => `${props.value} is not a valid email!`,
    },
  },
  FCMTokens: {
    type: [String],
    default: [],
  },
  // Legacy fields - will be removed after migration
  password: {
    type: String,
  },
  resetKey: {
    _id: false,
    value: {
      type: String,
    },
    expiresAt: {
      type: Date,
    },
  },
  session: {
    type: String,
  },
  accountType: {
    type: String,
    enum: ['GOOGLE', 'PASSWORD', 'EMAIL', 'CLERK'],
    default: 'CLERK',
  },
  loginCode: {
    code: {
      type: String,
    },
    created: {
      type: Date,
    },
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

UserSchema.methods.comparePasswords = function (candidatePassword?: string) {
  const user = this as User;

  if (!candidatePassword || !user.password) {
    return false;
  }

  return bcrypt.compareSync(candidatePassword, user.password);
};

UserSchema.methods.compareResetKey = function (resetKey?: string) {
  if (!resetKey) {
    return false;
  }

  const user = this as User;
  return (
    resetKey === user.resetKey?.value && new Date() < user.resetKey?.expiresAt
  );
};

UserSchema.methods.compareSessions = function (session?: string) {
  if (!session) {
    return false;
  }

  return session === (this as User).session;
};

UserSchema.methods.addToken = function (token?: string) {
  if (!token) {
    return false;
  }

  if ((this as User).FCMTokens?.includes(token)) {
    return false;
  }

  if ((this as User).FCMTokens?.length) {
    (this as User).FCMTokens?.push(token);
  } else {
    (this as User).FCMTokens = [token];
  }

  return true;
};

UserSchema.methods.removeToken = function (token?: string) {
  if (!token) {
    return false;
  }

  (this as User).FCMTokens = (this as User).FCMTokens?.filter(
    (t) => t !== token,
  );
};

UserSchema.methods.sanitize = function (): UserSanitized {
  return (this as User).toObject({
    transform: (doc, ret) =>
      ({
        firstname: ret.firstname,
        lastname: ret.lastname,
        email: ret.email,
        role: ret.role,
        _id: ret._id,
        clerkId: ret.clerkId,
        FCMTokens: ret.FCMTokens, // Fixed typo: was ret.FCMToken
      }) satisfies UserSanitized,
  });
};

UserSchema.methods.compareLoginCode = function (code?: string): boolean {
  if (!code) {
    return false;
  }

  return (
    code.trim().toLowerCase() === (this as User).loginCode?.code &&
    new Date().getTime() <
      ((this as User).loginCode?.created.getTime() || 0) + LOGIN_CODE_LIFETIME
  );
};

UserSchema.pre<User>('save', function (next) {
  if (this.isModified('password') && this.password) {
    this.password = bcrypt.hashSync(this.password, 10);
  }

  next();
});

const UserModel =
  (mongoose.models.User as Model<User>) ||
  mongoose.model<User>('User', UserSchema);

export default UserModel;
