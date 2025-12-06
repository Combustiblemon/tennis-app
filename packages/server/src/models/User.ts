import mongoose, { Model, Types } from 'mongoose';
import z from 'zod';

export const UserValidator = z.object({
  clerkId: z.string().optional(),
  role: z.enum(['ADMIN', 'USER', 'DEVELOPER']).default('USER'),
  email: z.string().email(),
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
    clerkId?: string;
    FCMTokens?: Array<string>;
    sanitize: () => UserSanitized;
    addToken: (token: string) => boolean;
    removeToken: (token: string) => boolean;
  };

export const UserSchema = new mongoose.Schema<User>(
  {
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
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  },
);

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

const UserModel =
  (mongoose.models.User as Model<User>) ||
  mongoose.model<User>('User', UserSchema);

export default UserModel;
