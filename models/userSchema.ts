import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  verified: boolean;
  admin: boolean;
  createdAt: Date;
  updatedAt: Date;
  credentials?: {
    SERPAPI_KEY?: string;
    OPENAI_API_KEY?: string;
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASSWORD?: string;
    IMAP_HOST?: string;
    IMAP_PORT?: string;
    IMAP_USER?: string;
    IMAP_PASSWORD?: string;
    ZOOM_EMAIL?: string;
    ZOOM_PASSWORD?: string;
    ZOOM_ACCOUNT_ID?: string;
    ZOOM_CLIENT_ID?: string;
    ZOOM_CLIENT_SECRET?: string;
    GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
    GOOGLE_CALENDAR_ID?: string;
  };
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  verified: {
    type: Boolean,
    default: false
  },
  admin: {
    type: Boolean,
    default: false
  },
  credentials: {
    SERPAPI_KEY: { type: String, default: '' },
    OPENAI_API_KEY: { type: String, default: '' },
    SMTP_HOST: { type: String, default: '' },
    SMTP_PORT: { type: String, default: '' },
    SMTP_USER: { type: String, default: '' },
    SMTP_PASSWORD: { type: String, default: '' },
    IMAP_HOST: { type: String, default: '' },
    IMAP_PORT: { type: String, default: '' },
    IMAP_USER: { type: String, default: '' },
    IMAP_PASSWORD: { type: String, default: '' },
    ZOOM_EMAIL: { type: String, default: '' },
    ZOOM_PASSWORD: { type: String, default: '' },
    ZOOM_ACCOUNT_ID: { type: String, default: '' },
    ZOOM_CLIENT_ID: { type: String, default: '' },
    ZOOM_CLIENT_SECRET: { type: String, default: '' },
    GOOGLE_SERVICE_ACCOUNT_EMAIL: { type: String, default: '' },
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: { type: String, default: '' },
    GOOGLE_CALENDAR_ID: { type: String, default: '' }
  }
}, {
  timestamps: true
});

// Note: unique: true on username and email fields automatically creates indexes
// No need for manual index creation

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema); 