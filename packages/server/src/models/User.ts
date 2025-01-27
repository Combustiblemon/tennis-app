import bcrypt from 'bcryptjs';
import mongoose, { Model } from 'mongoose';
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

export type UserSanitized = Pick<Users, SanitizedUserFields>;

export type Users = mongoose.Document &
  z.infer<typeof UserValidator> & {
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

export const UserSchema = new mongoose.Schema<Users>({
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
  const user = this as Users;

  if (!candidatePassword || !user.password) {
    return false;
  }

  return bcrypt.compareSync(candidatePassword, user.password);
};

UserSchema.methods.compareResetKey = function (resetKey?: string) {
  if (!resetKey) {
    return false;
  }

  const user = this as Users;
  return (
    resetKey === user.resetKey?.value && new Date() < user.resetKey?.expiresAt
  );
};

UserSchema.methods.compareSessions = function (session?: string) {
  if (!session) {
    return false;
  }

  return bcrypt.compareSync(session, (this as Users).session || '');
};

UserSchema.methods.sanitize = function (): UserSanitized {
  return (this as Users).toObject({
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

UserSchema.pre<Users>('save', function (next) {
  if (this.isModified('password') && this.password) {
    this.password = bcrypt.hashSync(this.password, 10);
  }

  if (this.isModified('session') && this.session) {
    this.session = bcrypt.hashSync(this.session, 10);
  }

  next();
});

const UserModel =
  (mongoose.models.User as Model<Users>) ||
  mongoose.model<Users>('User', UserSchema);

export default UserModel;
