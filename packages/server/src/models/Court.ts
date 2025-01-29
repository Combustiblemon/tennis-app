import mongoose from 'mongoose';
import z from 'zod';

import { weekDays } from '../modules/common';

export const CourtValidator = z.object({
  name: z.string().max(60),
  type: z.enum(['ASPHALT', 'HARD']),
  reservationsInfo: z.object({
    startTime: z.string(),
    endTime: z.string(),
    reservedTimes: z.array(
      z.object({
        startTime: z.string(),
        duration: z.number().positive().default(90),
        type: z.enum(['TRAINING', 'OTHER']),
        repeat: z.enum(['WEEKLY']).optional().default('WEEKLY'),
        days: z.array(z.enum(weekDays)).optional(),
        notes: z.string().max(200).optional(),
        datesNotApplied: z.array(z.string()).optional(),
      }),
    ),
    duration: z.number(),
  }),
});

export const CourtValidatorPartial = CourtValidator.deepPartial();

export type CourtDataType = z.infer<typeof CourtValidator> & {
  _id: string;
};

export type CourtType = mongoose.Document & CourtDataType;

export const CourtSchema = new mongoose.Schema<CourtType>({
  name: {
    type: String,
    maxlength: [60, 'Court name cannot be more than 60 characters'],
  },
  type: {
    type: String,
    enum: ['ASPHALT', 'HARD'],
  },
  reservationsInfo: {
    _id: false,
    startTime: {
      type: String,
      required: [true, 'Please add a start time'],
    },
    endTime: {
      type: String,
      required: [true, 'Please add an end time'],
    },
    reservedTimes: [
      {
        _id: false,
        startTime: {
          type: String,
          required: [true, 'Please add a start time'],
        },
        duration: {
          type: Number,
        },
        type: {
          type: String,
          enum: CourtValidator.shape.reservationsInfo.shape.reservedTimes
            .element.shape.type.options,
          required: [true, 'Please add a type'],
        },
        repeat: {
          type: String,
          enum: ['WEEKLY', 'MONTHLY', 'DAILY'],
        },
        days: [
          {
            type: String,
            enum: weekDays,
          },
        ],
        notes: {
          type: String,
        },
        datesNotApplied: {
          type: [String],
        },
      },
    ],
    duration: {
      type: Number,
      required: [true, 'Please add a duration in minutes'],
    },
  },
});

export default (mongoose.models.Court as mongoose.Model<CourtType>) ||
  mongoose.model<CourtType>('Court', CourtSchema);
