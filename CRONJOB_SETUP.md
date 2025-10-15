# Vercel Cronjob Setup Guide

## Overview
This guide explains how to set up Vercel Cron Jobs for the lead collection system to work automatically in the background, even when your browser/computer is off.

## Prerequisites
- Vercel Pro account (required for extended function timeouts)
- Project deployed on Vercel
- Environment variables configured

## Step 1: Verify Vercel Configuration

Ensure your `vercel.json` includes the following:

```json
{
  "functions": {
    "app/api/cron/**": {
      "maxDuration": 300
    },
    "app/api/jobs/**": {
      "maxDuration": 300
    }
  },
  "crons": [
    {
      "path": "/api/cron/process-jobs",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Step 2: Set Environment Variables

In your Vercel dashboard, add these environment variables:

1. **CRON_SECRET**: A secure random string for authenticating cron requests
   ```
   CRON_SECRET=your-secure-random-string-here
   ```

2. **Required API Keys**:
   ```
   SERPAPI_KEY=your-serpapi-key
   OPENAI_API_KEY=your-openai-key
   MONGODB_URI=your-mongodb-connection-string
   ```

## Step 3: Verify Deployment

1. Deploy your project to Vercel
2. Ensure you're on a Pro plan (required for 300-second timeouts)
3. Check that cron jobs are enabled in your Vercel dashboard

## Step 4: Test the System

### Health Check
Visit your deployed app and use the "Check Health" button, or call:
```
GET https://your-app.vercel.app/api/cron/health
```

### Manual Test
Use the "Test Cronjob" button in the UI, or call:
```
POST https://your-app.vercel.app/api/cron/health
```

## Step 5: Monitor Cronjob Activity

### In Vercel Dashboard
1. Go to your project settings
2. Navigate to "Functions" tab
3. Check cron job execution logs

### In Your App
1. Use the "Check Health" button to see system status
2. Monitor job queue in the leads collection page
3. Check job progress and completion rates

## How It Works

1. **Job Queuing**: When you submit services/locations, a job is created in the database
2. **Automatic Processing**: Vercel cron runs every 5 minutes and picks up pending jobs
3. **Background Execution**: Jobs continue running even when browser is closed
4. **Progress Tracking**: Real-time updates are stored in database
5. **Completion**: Results appear in your leads list when you return

## Troubleshooting

### Jobs Not Processing
1. Check Vercel function logs for errors
2. Verify environment variables are set
3. Ensure you're on Vercel Pro plan
4. Test manually using health endpoints

### Timeout Issues
- Pro plan allows 300 seconds (5 minutes) per function execution
- Each service-location combination is processed separately
- Jobs automatically resume on next cron cycle if interrupted

### Authentication Errors
- Verify CRON_SECRET is set correctly
- Check that the secret matches in both environment and code

## Key Benefits

✅ **No Browser Dependency**: Jobs run on Vercel servers
✅ **Extended Timeouts**: Pro plan allows 5-minute execution per step
✅ **Automatic Retry**: Failed jobs are retried on next cycle
✅ **Scalable**: Can handle unlimited service-location combinations
✅ **Monitoring**: Built-in health checks and progress tracking

## Next Steps

Once set up correctly:
1. Submit lead collection requests normally
2. Close your browser/computer
3. Return later to see completed results
4. Monitor system health regularly

The system will continue collecting leads in the background every 5 minutes until all queued jobs are completed! 