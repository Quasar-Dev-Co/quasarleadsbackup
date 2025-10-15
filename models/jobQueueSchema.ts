import mongoose, { Schema, Document } from 'mongoose';

export interface IJobQueue extends Document {
  jobId: string;
  type: 'lead-collection' | 'google-ads-check' | 'email-sequence';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  services: string[];
  locations: string[];
  leadQuantity: number;
  currentService: string;
  currentLocation: string;
  currentStep: number;
  totalSteps: number;
  progress: number;
  progressMessage: string;
  collectedLeads: number;
  totalLeadsCollected: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
  maxRetries: number;
  estimatedDuration: number; // in minutes
  actualDuration?: number; // in minutes
  includeGoogleAdsAnalysis?: boolean; // Whether to include Google Ads analysis
  analyzeLeads?: boolean; // Whether to analyze leads for high-value opportunities
  userId?: string; // User ID who created this job
  
  // NEW: Email sequence job fields
  leadId?: string; // For email sequence jobs
  emailSchedule?: {
    step: number;
    stage: string;
    scheduledAt: Date;
    sentAt?: Date;
    messageId?: string;
    status: 'pending' | 'sent' | 'failed';
    error?: string;
  }[];
  nextEmailDue?: Date; // When the next email should be sent
}

const jobQueueSchema = new Schema<IJobQueue>({
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['lead-collection', 'google-ads-check', 'email-sequence'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  priority: {
    type: Number,
    default: 1,
    index: true
  },
  services: [{
    type: String,
    required: true
  }],
  locations: [{
    type: String,
    required: true
  }],
  leadQuantity: {
    type: Number,
    required: true
  },
  currentService: {
    type: String,
    default: ''
  },
  currentLocation: {
    type: String,
    default: ''
  },
  currentStep: {
    type: Number,
    default: 0
  },
  totalSteps: {
    type: Number,
    required: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  progressMessage: {
    type: String,
    default: 'Initializing...'
  },
  collectedLeads: {
    type: Number,
    default: 0
  },
  totalLeadsCollected: {
    type: Number,
    default: 0
  },
  errorMessage: {
    type: String
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  estimatedDuration: {
    type: Number,
    default: 0
  },
  actualDuration: {
    type: Number
  },
  includeGoogleAdsAnalysis: {
    type: Boolean,
    default: false
  },
  analyzeLeads: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    trim: true,
    index: true
  },
  leadId: {
    type: String
  },
  emailSchedule: [{
    step: {
      type: Number,
      required: true
    },
    stage: {
      type: String,
      required: true
    },
    scheduledAt: {
      type: Date,
      required: true
    },
    sentAt: {
      type: Date
    },
    messageId: {
      type: String
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      required: true
    },
    error: {
      type: String
    }
  }],
  nextEmailDue: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
jobQueueSchema.index({ status: 1, priority: -1, createdAt: 1 });
jobQueueSchema.index({ type: 1, status: 1 });
jobQueueSchema.index({ createdAt: -1 });

// Virtual for calculating actual duration
jobQueueSchema.virtual('duration').get(function() {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt.getTime() - this.startedAt.getTime()) / (1000 * 60));
  }
  return null;
});

// Method to update progress
jobQueueSchema.methods.updateProgress = function(progress: number, message: string, currentStep?: number) {
  this.progress = Math.min(100, Math.max(0, progress));
  this.progressMessage = message;
  if (currentStep !== undefined) {
    this.currentStep = currentStep;
  }
  this.updatedAt = new Date();
  return this.save();
};

// Method to start job
jobQueueSchema.methods.startJob = function() {
  this.status = 'running';
  this.startedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

// Method to complete job
jobQueueSchema.methods.completeJob = function(totalLeadsCollected: number) {
  this.status = 'completed';
  this.progress = 100;
  this.progressMessage = 'Job completed successfully!';
  this.completedAt = new Date();
  this.totalLeadsCollected = totalLeadsCollected;
  this.updatedAt = new Date();
  return this.save();
};

// Method to fail job
jobQueueSchema.methods.failJob = function(errorMessage: string) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.completedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

// Static method to get next pending job
jobQueueSchema.statics.getNextPendingJob = function() {
  return this.findOne({
    status: 'pending'
  }).sort({
    priority: -1,
    createdAt: 1
  });
};

// Static method to get running jobs
jobQueueSchema.statics.getRunningJobs = function() {
  return this.find({
    status: 'running'
  }).sort({
    startedAt: -1
  });
};

// Static method to get job statistics
jobQueueSchema.statics.getJobStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalLeads: { $sum: '$totalLeadsCollected' }
      }
    }
  ]);
};

export default mongoose.models.JobQueue || mongoose.model<IJobQueue>('JobQueue', jobQueueSchema); 