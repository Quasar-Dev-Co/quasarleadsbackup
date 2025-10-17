import mongoose, { Document, Schema } from 'mongoose';

type StatusType = 
  "active" | 
  "emailed" | 
  "replied" | 
  "booked" | 
  "not interested" | 
  "closed won" | 
  "closed lost" | 
  "archived";

interface Lead extends Document {
  name: string;
  company: string;
  companyOwner?: string; // NEW: Company owner name from OpenAI lookup
  location: string;
  website?: string;
  email: string;  // Required
  phone?: string; // Optional
  linkedinProfile?: string; // Optional
  status: StatusType;
  googleAds: boolean; // NEW: Track if company is running Google Ads
  googleAdsChecked: boolean; // NEW: Track if we've checked for Google Ads
  organicRanking?: number; // NEW: Their organic ranking position (1-100+)
  isHighValue?: boolean; // NEW: High-value lead (running ads but poor organic ranking)
  notes?: string;
  tags?: string[];
  source?: string;
  industry?: string;
  address?: string; // For Google Maps businesses
  latitude?: number;
  longitude?: number;
  rating?: number; // Google Maps business rating (e.g., 4.5 out of 5)
  reviews?: number; // Google Maps business review count (e.g., 127)
  // Auth/Executive information from OpenAI enrichment
  authInformation?: {
    company_name: string;
    company_email: string;
    owner_name: string;
    owner_email: string;
    manager_name: string;
    manager_email: string;
    hr_name: string;
    hr_email: string;
    executive_name: string;
    executive_email: string;
  };
  lastContactedAt?: Date;
  lastEmailedAt?: Date; // NEW: Track last automated email sent
  
  // Email Automation Settings
  emailAutomationEnabled?: boolean; // NEW: Enable/disable email automation for this lead
  emailSequenceStage?: string; // NEW: Current stage in automated email sequence
  emailSequenceStartDate?: Date; // NEW: When email sequence started
  emailSequenceActive?: boolean; // NEW: Whether sequence is currently active
  nextScheduledEmail?: Date; // NEW: When next automated email should be sent
  emailSequenceStep?: number; // NEW: Current step in sequence (1-7)
  emailStoppedReason?: string; // NEW: Why email sequence was stopped
  
  // Email retry and failure tracking
  emailRetryCount?: number;
  emailFailureCount?: number;
  emailLastAttempt?: Date;
  emailStatus?: string;
  emailErrors?: Array<{
    attempt: number;
    error: string;
    timestamp: Date;
  }>;
  // Outreach configuration
  outreachRecipient?: 'lead' | 'company';
  senderIdentity?: 'company' | 'author';
  
  // Email history with complete tracking
  emailHistory?: Array<{
    stage: string;
    sentAt: Date;
    messageId?: string;
    status: 'sent' | 'failed' | 'bounced' | 'opened' | 'clicked' | 'pending';
    retryCount?: number;
    error?: string;
    manual?: boolean;
    emailContent?: {
      subject: string;
      htmlContent: string;
      textContent: string;
      from: string;
      to: string;
    };
  }>;
  
  nextFollowUpDate?: Date;
  followUpCount?: number;
  assignedTo?: string;
  leadsCreatedBy?: string; // User ID who created this lead
  dealValue?: number;
  probability?: number;
  // Deal closure tracking
  budget?: number; // Lead's budget for the project
  closedDate?: Date; // When deal was won/lost
  closedReason?: string; // Why deal was won/lost
  lossReason?: string; // Specific loss reason
  lossDescription?: string; // Detailed description of why lost
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<Lead>({
  name: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  company: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  companyOwner: {
    type: String,
    trim: true,
    index: true
  },
  location: { 
    type: String, 
    required: true,
    trim: true
  },
  website: { 
    type: String, 
    trim: true
  },
  email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(v);
      },
      message: (props: any) => `${props.value} is not a valid email address!`
    }
  },
  phone: { 
    type: String, 
    trim: true
  },
  linkedinProfile: { 
    type: String, 
    trim: true,
    required: false
  },
  status: {
    type: String,
    enum: ['active', 'emailed', 'replied', 'booked', 'not interested', 'closed won', 'closed lost', 'archived'],
    default: 'active',
    index: true
  },
  googleAds: {
    type: Boolean,
    default: false
  },
  googleAdsChecked: {
    type: Boolean,
    default: false
  },
  organicRanking: {
    type: Number,
    min: 1,
    max: 100
  },
  isHighValue: {
    type: Boolean,
    default: false,
    index: true
  },
  notes: { 
    type: String, 
    default: '' 
  },
  tags: { 
    type: [String], 
    default: [],
    index: true
  },
  source: {
    type: String,
    default: 'search', // 'search', 'google-maps', 'organic-search', 'manual', 'import', etc.
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  rating: {
    type: Number
  },
  reviews: {
    type: Number
  },
  // Auth/Executive information from OpenAI enrichment
  authInformation: {
    company_name: { type: String, default: '' },
    company_email: { type: String, default: '' },
    owner_name: { type: String, default: '' },
    owner_email: { type: String, default: '' },
    manager_name: { type: String, default: '' },
    manager_email: { type: String, default: '' },
    hr_name: { type: String, default: '' },
    hr_email: { type: String, default: '' },
    executive_name: { type: String, default: '' },
    executive_email: { type: String, default: '' }
  },
  lastContactedAt: { 
    type: Date 
  },
  lastEmailedAt: {
    type: Date
  },
  emailHistory: {
    type: [{
      stage: String,
      sentAt: Date,
      messageId: String,
      status: String,
      retryCount: { type: Number, default: 0 },
      error: String,
      manual: { type: Boolean, default: false },
      emailContent: {
        subject: String,
        htmlContent: String,
        textContent: String,
        from: String,
        to: String
      }
    }],
    default: []
  },
  // Email Automation Schema Fields
  emailAutomationEnabled: {
    type: Boolean,
    default: true // Enable by default for new leads
  },
  emailSequenceStage: {
    type: String,
    enum: ['not_called', 'called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'],
    default: null
  },
  emailSequenceStartDate: {
    type: Date,
    index: true
  },
  emailSequenceActive: {
    type: Boolean,
    default: false
  },
  nextScheduledEmail: {
    type: Date,
    default: null
  },
  emailSequenceStep: {
    type: Number,
    default: null
  },
  emailStoppedReason: {
    type: String,
    trim: true
  },
  nextFollowUpDate: {
    type: Date,
    index: true
  },
  followUpCount: {
    type: Number,
    default: 0,
    min: 0
  },
  assignedTo: {
    type: String,
    trim: true,
    index: true
  },
  leadsCreatedBy: {
    type: String,
    trim: true,
    index: true
  },
  dealValue: {
    type: Number,
    min: 0
  },
  probability: {
    type: Number,
    min: 0,
    max: 100
  },
  // Deal closure tracking
  budget: {
    type: Number,
    min: 0
  },
  closedDate: {
    type: Date
  },
  closedReason: {
    type: String,
    trim: true
  },
  lossReason: {
    type: String,
    enum: ['not_interested', 'no_budget', 'no_response', 'competitor', 'too_early', 'no_fit', 'other'],
    trim: true
  },
  lossDescription: {
    type: String,
    trim: true
  },
  emailRetryCount: {
    type: Number,
    default: 0
  },
  emailFailureCount: {
    type: Number,
    default: 0
  },
  emailLastAttempt: {
    type: Date,
    default: null
  },
  emailStatus: {
    type: String,
    enum: ['ready', 'sending', 'sent', 'failed', 'max_retries_exceeded'],
    default: 'ready'
  },
  emailErrors: [{
    attempt: Number,
    error: String,
    timestamp: Date
  }]
  ,
  // Outreach configuration
  outreachRecipient: {
    type: String,
    enum: ['lead', 'company'],
    default: 'lead',
    index: true
  },
  senderIdentity: {
    type: String,
    enum: ['company', 'author'],
    default: 'company',
    index: true
  }
}, {
  timestamps: true,
});

// Compound indexes for common queries
leadSchema.index({ status: 1, nextFollowUpDate: 1 });
leadSchema.index({ tags: 1, status: 1 });
leadSchema.index({ source: 1 }); // For filtering by lead source
leadSchema.index({ location: 1 }); // For geographical queries
leadSchema.index({ location: 1, tags: 1 }); // For complex filtering
leadSchema.index({ googleAds: 1 }); // NEW: For filtering high-value Google Ads leads
leadSchema.index({ googleAds: 1, status: 1 }); // NEW: For complex Google Ads filtering
leadSchema.index({ isHighValue: 1, status: 1 }); // NEW: For high-value lead filtering
// Email Automation Indexes
leadSchema.index({ emailSequenceActive: 1, nextScheduledEmail: 1 }); // NEW: For cron job email processing
leadSchema.index({ emailAutomationEnabled: 1, emailSequenceActive: 1 }); // NEW: For automation management
leadSchema.index({ emailSequenceStage: 1, emailSequenceStep: 1 }); // NEW: For sequence tracking

// Virtual for contact info
leadSchema.virtual('contactInfo').get(function() {
  return {
    email: this.email,
    phone: this.phone,
    linkedin: this.linkedinProfile,
    website: this.website
  };
});

// Virtual for location coordinates
leadSchema.virtual('coordinates').get(function() {
  if (this.latitude && this.longitude) {
    return {
      lat: this.latitude,
      lng: this.longitude
    };
  }
  return null;
});

// Method to mark lead as contacted
leadSchema.methods.markContacted = function() {
  this.lastContactedAt = new Date();
  this.followUpCount = (this.followUpCount || 0) + 1;
  return this.save();
};

// Method to update status
leadSchema.methods.updateStatus = function(newStatus: StatusType) {
  this.status = newStatus;
  
  // If status is "emailed", update lastContactedAt
  if (newStatus === 'emailed') {
    this.lastContactedAt = new Date();
    this.followUpCount = (this.followUpCount || 0) + 1;
  }
  
  return this.save();
};

// Method to set next follow-up
leadSchema.methods.scheduleFollowUp = function(daysFromNow: number) {
  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + daysFromNow);
  this.nextFollowUpDate = followUpDate;
  return this.save();
};

// NEW: Method to update Google Ads status
leadSchema.methods.updateGoogleAdsStatus = function(hasGoogleAds: boolean, organicRanking?: number) {
  this.googleAds = hasGoogleAds;
  this.googleAdsChecked = true;
  if (organicRanking) {
    this.organicRanking = organicRanking;
  }
  return this.save();
};

// Static method to find leads that need follow-up today
leadSchema.statics.getDueFollowUps = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    nextFollowUpDate: { 
      $gte: today, 
      $lt: tomorrow 
    },
    status: { 
      $nin: ['closed won', 'closed lost', 'not interested', 'archived'] 
    }
  }).sort('nextFollowUpDate');
};

// Static method to get leads by location
leadSchema.statics.getLeadsByLocation = function(location: string) {
  return this.find({
    location: { $regex: new RegExp(location, 'i') }
  }).sort('-createdAt');
};

// NEW: Static method to find high-value leads (have Google Ads but poor organic ranking)
leadSchema.statics.getHighValueLeads = function() {
  return this.find({
    googleAds: true,
    $or: [
      { organicRanking: { $gt: 10 } }, // Not in top 10 organic results
      { organicRanking: { $exists: false } } // No organic ranking found
    ],
    status: { 
      $nin: ['closed won', 'closed lost', 'not interested', 'archived'] 
    }
  }).sort('-createdAt');
};

// Create model
const Lead = mongoose.models.Lead || mongoose.model<Lead>('Lead', leadSchema);

export default Lead;
export { Lead };