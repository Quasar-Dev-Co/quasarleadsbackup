# Background Job System for Lead Collection

## Overview

This implementation solves the Vercel timeout limitation (15 minutes) by using **Vercel Cron Jobs** to process lead collection tasks in the background. The system can handle unlimited service-location combinations without timing out.

## How It Works

### 1. Job Queue System
- When you submit a lead collection request, it creates a job in the database queue
- Jobs are processed one at a time by the cron job system
- Each job processes one service-location combination per execution

### 2. Vercel Cron Jobs
- Runs every 5 minutes automatically
- Picks up the next pending job from the queue
- Processes one step (service-location combination) per execution
- Updates progress in real-time

### 3. Real-time Progress Tracking
- Job progress is stored in MongoDB
- UI polls for updates every 5 seconds
- Shows queue position, estimated time, and current progress

## Architecture

```
User Input → Job Queue → Cron Job → Lead Collection → Database
     ↓           ↓          ↓           ↓              ↓
  Frontend → MongoDB → Vercel → SerpAPI/OpenAI → Leads Table
```

## Key Components

### 1. Database Schema (`models/jobQueueSchema.ts`)
```typescript
interface IJobQueue {
  jobId: string;
  type: 'lead-collection' | 'google-ads-check';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  services: string[];
  locations: string[];
  currentStep: number;
  totalSteps: number;
  progress: number;
  progressMessage: string;
  // ... more fields
}
```

### 2. API Endpoints

#### Queue Job (`/api/jobs/queue`)
- **POST**: Creates a new job in the queue
- **GET**: Retrieves job queue and statistics

#### Job Status (`/api/jobs/status/[jobId]`)
- **GET**: Gets real-time job status and progress
- **DELETE**: Cancels a running job

#### Cron Job (`/api/cron/process-jobs`)
- **GET**: Processes the next pending job
- Runs every 5 minutes via Vercel Cron Jobs

### 3. UI Components

#### Job Progress Component (`components/ui/job-progress.tsx`)
- Real-time progress display
- Queue position indicator
- Estimated completion time
- Cancel job functionality

#### Updated Leads Page (`app/leads/page.tsx`)
- Background job queuing
- Job progress tracking
- Active jobs summary

## Configuration

### Vercel Configuration (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/cron/process-jobs",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Usage Example

### 1. Submit a Job
```typescript
// User enters:
Services: "Web Development, SEO"
Locations: "Dhaka, Delhi, Singapore"

// System calculates:
Total Steps: 2 services × 3 locations = 6 steps
Estimated Duration: 6 × 10 minutes = 60 minutes
```

### 2. Job Processing
```
Step 1: Web Development in Dhaka (10 minutes max)
Step 2: Web Development in Delhi (10 minutes max)
Step 3: Web Development in Singapore (10 minutes max)
Step 4: SEO in Dhaka (10 minutes max)
Step 5: SEO in Delhi (10 minutes max)
Step 6: SEO in Singapore (10 minutes max)
```

### 3. Real-time Updates
- Job starts in queue position #1
- Progress updates every 5 seconds
- Shows current step and estimated time remaining
- Automatically refreshes leads when complete
- Each step has a 10-minute timeout protection

## Benefits

### 1. No Timeout Issues
- Each cron job execution is limited to 15 minutes
- Processes one step per execution
- Can handle unlimited combinations

### 2. Scalability
- Queue system handles multiple jobs
- Priority-based processing
- Automatic retry mechanism

### 3. User Experience
- Real-time progress tracking
- Queue position visibility
- Estimated completion times
- Background processing (no browser dependency)

### 4. Reliability
- Job persistence in database
- Error handling and recovery
- Progress tracking across server restarts

## Error Handling

### 1. Job Failures
- Individual step failures don't stop the entire job
- Error messages are logged and displayed
- Failed jobs can be retried

### 2. Network Issues
- API rate limiting with delays
- Graceful error handling
- Automatic retries for transient failures

### 3. Server Restarts
- Jobs persist in database
- Progress is maintained
- Automatic resumption

## Monitoring

### 1. Job Statistics
- Total jobs processed
- Success/failure rates
- Average processing times
- Queue length monitoring

### 2. Performance Metrics
- Leads collected per job
- Processing time per step
- API usage statistics
- Error rates

## Deployment

### 1. Environment Variables
```bash
SERPAPI_KEY=your_serpapi_key
OPENAI_API_KEY=your_openai_key
MONGODB_URI=your_mongodb_connection
```

### 2. Vercel Deployment
- Deploy to Vercel with cron job support
- Ensure environment variables are set
- Monitor cron job execution logs

### 3. Database Setup
- MongoDB connection configured
- Job queue indexes created
- Lead collection schema updated

## Troubleshooting

### 1. Jobs Not Processing
- Check Vercel cron job logs
- Verify database connection
- Ensure API keys are valid

### 2. Progress Not Updating
- Check job status API endpoint
- Verify polling interval
- Check network connectivity

### 3. High Error Rates
- Review API rate limits
- Check SerpAPI/OpenAI quotas
- Monitor error logs

## Future Enhancements

### 1. Advanced Features
- Job scheduling (run at specific times)
- Job dependencies (sequential processing)
- Parallel processing (multiple jobs)
- Advanced filtering and search

### 2. Monitoring
- Email notifications for job completion
- Slack/Discord integration
- Detailed analytics dashboard
- Performance optimization

### 3. Scalability
- Multiple worker processes
- Load balancing
- Database sharding
- Caching layer

## Conclusion

This background job system provides a robust, scalable solution for lead collection that overcomes Vercel's timeout limitations while providing excellent user experience with real-time progress tracking. 