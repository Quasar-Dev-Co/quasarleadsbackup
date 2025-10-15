# QuasarLeads - Lead Collection System

A Next.js application for automated lead collection with background job processing, Google Ads detection, and real-time progress tracking.

## Features

- 🚀 **Background Job Processing**: Overcome Vercel's 15-minute timeout limit with automated background processing
- 🔍 **Google Ads Detection**: Automatically identify high-value leads running Google Ads
- 📊 **Real-time Progress Tracking**: Monitor job progress with live updates
- 🛠️ **Local Development Support**: Full functionality in both localhost and production
- 📈 **Lead Management**: Organize leads by status (new, processing, high-value)
- 🔄 **Queue Management**: View and manage multiple active jobs

## Background Job System

### Production (Vercel)
- Uses Vercel Cron Jobs to process jobs every 5 minutes
- Automatically handles job queuing and processing
- Maximum 10 minutes per service-location combination
- Real-time progress updates via API polling

### Local Development
- Automatic local job processing for development mode
- Manual job triggering via UI or script
- Faster polling (2 seconds vs 5 seconds in production)
- Development script for testing: `node scripts/dev-job-processor.js`

## Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Environment variables (see below)

### Environment Variables

Create a `.env.local` file with:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# APIs
SERPAPI_KEY=your_serpapi_key
OPENAI_API_KEY=your_openai_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

### Lead Collection

1. **Enter Services**: Web Development, SEO, Marketing, etc.
2. **Enter Locations**: Dhaka, Delhi, Hong Kong, etc.
3. **Set Lead Quantity**: 50, 100, 200, or custom amount
4. **Start Collection**: Jobs are queued and processed automatically

### Job Management

- **View Progress**: Monitor active jobs in real-time
- **Job Queue**: See all pending, running, and completed jobs
- **Cancel Jobs**: Stop running jobs if needed
- **Development Mode**: Manual job triggering for testing

### Local Development

#### Automatic Processing
Jobs are automatically started in development mode when:
- A new job is queued
- The page loads with pending jobs

#### Manual Processing
Use the development script:

```bash
# Show job queue status
node scripts/dev-job-processor.js

# Process specific job
node scripts/dev-job-processor.js --job-id <jobId>

# Process all pending jobs
node scripts/dev-job-processor.js --all
```

#### Manual UI Trigger
In development mode, pending jobs show a "Start Local Processing" button.

## API Endpoints

### Job Management
- `POST /api/jobs/queue` - Queue a new job
- `GET /api/jobs/queue` - Get job queue status
- `GET /api/jobs/status/:jobId` - Get specific job status
- `DELETE /api/jobs/status/:jobId` - Cancel a job
- `POST /api/jobs/process-local` - Start local job processing (development)

### Lead Management
- `GET /api/leads` - Get leads with optional status filter
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead status

### Cron Jobs (Production)
- `GET /api/cron/process-jobs` - Process pending jobs (Vercel Cron)

## Job Processing Flow

1. **Job Queuing**: User submits services and locations
2. **Job Creation**: Job is created with pending status
3. **Processing**: Job processor picks up pending jobs
4. **Step Execution**: Each service-location combination processed
5. **Lead Collection**: Organic search and website scraping
6. **Google Ads Check**: High-value lead detection
7. **Database Storage**: Leads saved to MongoDB
8. **Progress Updates**: Real-time status updates
9. **Completion**: Job marked as completed

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Job Triggering | Automatic + Manual | Vercel Cron (5min) |
| Polling Interval | 2 seconds | 5 seconds |
| Timeout per Step | 10 minutes | 10 minutes |
| Manual Control | Yes | No |
| Debug Info | Yes | No |

## Troubleshooting

### Jobs Not Processing (Development)
1. Check if job is in "pending" status
2. Click "Start Local Processing" button
3. Use development script: `node scripts/dev-job-processor.js --all`
4. Check browser console for errors

### Jobs Not Processing (Production)
1. Verify Vercel Cron Jobs are enabled
2. Check Vercel function logs
3. Ensure environment variables are set
4. Verify MongoDB connection

### No Leads Collected
1. Check SerpAPI key is valid
2. Verify search queries are working
3. Check website scraping is successful
4. Review error messages in job status

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [SerpAPI](https://serpapi.com/)
- [OpenAI API](https://platform.openai.com/)
