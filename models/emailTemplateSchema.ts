import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailTemplate extends Document {
  stage: string;
  subject: string;
  contentPrompt: string; // AI prompt for generating email content
  emailSignature: string; // Email signature
  mediaLinks: string; // Media content (images, videos)
  htmlContent: string; // LEGACY: Keep for backwards compatibility
  textContent: string;
  isActive: boolean;
  variables: string[];
  userId?: string; // User ID who created this template
  timing?: {
    delay: number;
    unit: 'minutes' | 'hours' | 'days';
    description: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>({
  stage: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    trim: true,
    index: true
  },
  subject: {
    type: String,
    required: true
  },
  contentPrompt: {
    type: String,
    default: ''
  },
  emailSignature: {
    type: String,
    default: ''
  },
  mediaLinks: {
    type: String,
    default: ''
  },
  htmlContent: {
    type: String,
    default: '' // Not required anymore (backwards compatibility)
  },
  textContent: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  variables: [{
    type: String
  }],
  timing: {
    delay: {
      type: Number,
      default: 7
    },
    unit: {
      type: String,
      enum: ['minutes', 'hours', 'days'],
      default: 'days'
    },
    description: {
      type: String,
      default: 'Send after 7 days'
    }
  }
}, {
  timestamps: true
});

// Create unique compound index for stage + userId to allow multiple users to have templates with the same stage
// but prevent duplicate stages per user
EmailTemplateSchema.index({ stage: 1, userId: 1 }, { unique: true });

const EmailTemplate = mongoose.models.EmailTemplate || mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);

export default EmailTemplate;