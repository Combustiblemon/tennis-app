import mongoose from 'mongoose';
import z from 'zod';

export const AnnouncementValidator = z.object({
  title: z.string().max(160),
  body: z.string().max(600).optional(),
  validUntil: z.string(),
  visible: z.boolean().optional().default(true),
});

export const AnnouncementValidatorPartial = AnnouncementValidator.deepPartial();

export type AnnouncementDataType = z.infer<typeof AnnouncementValidator> & {
  _id: string;
};

export type AnnouncementType = mongoose.Document & AnnouncementDataType;

export const AnnouncementSchema = new mongoose.Schema<AnnouncementType>({
  title: {
    type: String,
  },
  body: {
    type: String,
  },
  validUntil: {
    type: String,
  },
  visible: {
    type: Boolean,
  },
});

export default (mongoose.models
  .Announcement as mongoose.Model<AnnouncementType>) ||
  mongoose.model<AnnouncementType>('Announcement', AnnouncementSchema);
