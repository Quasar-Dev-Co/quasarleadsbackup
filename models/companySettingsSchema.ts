import mongoose, { Document, Schema } from 'mongoose';

type TimingUnit = 'minutes' | 'hours' | 'days';

export interface IEmailTiming {
  stage: string;
  delay: number;
  unit: TimingUnit;
  description: string;
}

export interface ICompanySettings extends Document {
  userId?: string; // If present, these settings are specific to a user
  type?: string;   // 'default' for global fallback
  companyName: string;
  service: string;
  industry?: string;
  senderName: string;
  senderEmail: string;
  websiteUrl?: string;
  logoUrl?: string;
  defaultOutreachRecipient?: 'lead' | 'company';
  defaultSenderIdentity?: 'company' | 'author';
  emailTimings: IEmailTiming[];
  createdAt: Date;
  updatedAt: Date;
}

const EmailTimingSchema = new Schema<IEmailTiming>({
  stage: { type: String, required: true },
  delay: { type: Number, required: true, default: 7 },
  unit: { type: String, enum: ['minutes', 'hours', 'days'], required: true, default: 'days' },
  description: { type: String, default: 'Send after 7 days' }
}, { _id: false });

const CompanySettingsSchema = new Schema<ICompanySettings>({
  userId: { type: String, index: true, sparse: true, trim: true },
  type: { type: String, trim: true }, // when 'default', used as global fallback
  companyName: { type: String, required: true, trim: true },
  service: { type: String, required: true, trim: true },
  industry: { type: String, default: '', trim: true },
  senderName: { type: String, required: true, trim: true },
  senderEmail: { type: String, required: true, trim: true },
  websiteUrl: { type: String, default: '', trim: true },
  logoUrl: { type: String, default: '', trim: true },
  defaultOutreachRecipient: { type: String, enum: ['lead', 'company'], default: 'lead' },
  defaultSenderIdentity: { type: String, enum: ['company', 'author'], default: 'company' },
  emailTimings: { type: [EmailTimingSchema], default: [] }
}, {
  timestamps: true
});

// Ensure one settings document per user
CompanySettingsSchema.index({ userId: 1 }, { unique: true, sparse: true });
// Fast lookup for default fallback
CompanySettingsSchema.index({ type: 1 });

const CompanySettings = mongoose.models.CompanySettings || mongoose.model<ICompanySettings>('CompanySettings', CompanySettingsSchema);

export default CompanySettings;

