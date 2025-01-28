import bcrypt from 'bcryptjs';
import mongoose, { Model, Types } from 'mongoose';
import z from 'zod';

export const UserValidator = z.object({
  name: z.string().max(60),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  accountType: z.enum(['GOOGLE', 'PASSWORD']).optional(),
});

type SanitizedUserFields =
  | 'name'
  | 'email'
  | 'role'
  | '_id'
  | 'FCMTokens'
  | 'session';

export type UserDataType = z.infer<typeof UserValidator>;

export type UserSanitized = Pick<User, SanitizedUserFields>;

export type User = mongoose.Document &
  z.infer<typeof UserValidator> & {
    _id: Types.ObjectId;
    resetKey?: {
      value: string;
      expiresAt: Date;
    };
    FCMTokens?: Array<string>;
    session?: string;
    comparePasswords: (candidatePassword?: string) => boolean;
    compareResetKey: (resetKey?: string) => boolean;
    compareSessions: (session?: string) => boolean;
    sanitize: () => UserSanitized;
  };

export const UserSchema = new mongoose.Schema<User>({
  name: {
    type: String,
    maxlength: [60, 'User name cannot be more than 60 characters'],
    required: [true, 'Please add a User name'],
  },
  role: {
    type: String,
    enum: ['ADMIN', 'USER'],
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
  FCMTokens: {
    type: [String],
  },
  session: {
    type: String,
  },
  accountType: {
    type: String,
    enum: ['GOOGLE', 'PASSWORD'],
  },
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

UserSchema.methods.sanitize = function (): UserSanitized {
  return (this as User).toObject({
    transform: (doc, ret) =>
      ({
        name: ret.name,
        email: ret.email,
        role: ret.role,
        _id: ret._id,
        FCMTokens: ret.FCMToken,
        session: ret.session,
      }) satisfies UserSanitized,
  });
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
