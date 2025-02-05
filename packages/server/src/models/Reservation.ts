import mongoose, { Model } from 'mongoose';
import z from 'zod';

import { zodObjectId } from '../modules/common';

const statusEnumValues = ['PENDING', 'APPROVED', 'REJECTED'] as const;
const typeEnumValues = ['SINGLE', 'DOUBLE', 'TRAINING', 'PERSONAL'] as const;

export const ReservationValidator = z.object({
  type: z.enum(typeEnumValues),
  datetime: z.string(),
  people: z.array(z.string().max(50)),
  owner: z.string().refine(zodObjectId).optional(),
  court: z.string(),
  status: z.enum(statusEnumValues).default('APPROVED'),
  paid: z.boolean().default(false),
  duration: z.number().positive().optional().default(90),
  notes: z.string().max(500).optional(),
});

export const ReservationValidatorPartial = ReservationValidator.deepPartial();

type ReservationSanitized = Pick<
  ReservationType,
  'type' | 'court' | 'datetime' | 'duration' | 'notes'
>;

export type ReservationDataType = Omit<
  z.infer<typeof ReservationValidator>,
  'owner'
> & {
  _id: mongoose.Types.ObjectId;
  owner?: mongoose.Types.ObjectId;
};

export type ReservationType = mongoose.Document &
  ReservationDataType & {
    sanitize: () => ReservationSanitized;
  };

export const ReservationSchema = new mongoose.Schema<ReservationType>({
  type: {
    type: String,
    enum: typeEnumValues,
  },
  datetime: {
    // !THIS IS NOT AN ISO DATE EVEN THOUGH IT IS IN THE SAME FORMAT
    type: String,
    required: [true, 'Please add a date and time'],
  },
  duration: {
    type: Number,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId as unknown as StringConstructor,
    ref: 'User',
  },
  court: {
    type: mongoose.Schema.Types.ObjectId as unknown as StringConstructor,
    ref: 'Court',
  },
  status: {
    type: String,
    enum: statusEnumValues,
  },
  paid: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
  },
  people: [String],
});

ReservationSchema.methods.sanitize = function (): ReservationSanitized {
  return (this as ReservationType).toObject({
    transform: (doc, ret) =>
      ({
        court: ret.court,
        datetime: ret.datetime,
        duration: ret.duration,
        type: ret.type,
        notes: ret.notes,
      }) satisfies ReservationSanitized,
  });
};

const ReservationModel =
  (mongoose.models.Reservation as Model<ReservationType>) ||
  mongoose.model<ReservationType>('Reservation', ReservationSchema);

export default ReservationModel;
