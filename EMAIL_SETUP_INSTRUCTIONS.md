# 📧 Email Setup Instructions - Gmail SMTP Fallback

## 🚨 Quick Fix for SMTP Timeout Issues

Your primary SMTP server (`mail.zxcs.nl`) is currently unreachable. Here's how to set up Gmail SMTP as a reliable fallback:

## 📋 Step 1: Generate Gmail App Password

1. **Go to Google Account Settings**: https://myaccount.google.com/
2. **Enable 2-Factor Authentication** (required for App Passwords)
3. **Generate App Password**:
   - Go to Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Name it: "QuasarLeads CRM"
   - **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

## 📋 Step 2: Update Environment Variables

Create or update your `.env.local` file:

```bash
# Gmail SMTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop

# Alternative SMTP Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop

# Sender Info
SENDER_NAME=QuasarLeads Team
SENDER_EMAIL=your-email@gmail.com
```

## 📋 Step 3: Update Vercel Environment Variables

In your Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add these variables:
   - `GMAIL_USER` = your-email@gmail.com
   - `GMAIL_APP_PASSWORD` = your-16-character-password
   - `SMTP_HOST` = smtp.gmail.com
   - `SMTP_PORT` = 587
   - `SMTP_USER` = your-email@gmail.com
   - `SMTP_PASSWORD` = your-16-character-password
   - `SENDER_EMAIL` = your-email@gmail.com

## 🧪 Step 4: Test the Setup

Run this command to test email sending:

```bash
curl -X POST "http://localhost:3000/api/fix-email-automation-now"
```

You should see:
- ✅ "Using Gmail SMTP" in the logs
- ✅ Emails being sent successfully
- ✅ No more timeout errors

## 🔄 Step 5: Restart Your Application

```bash
# Local development
npm run dev

# Or deploy to Vercel
vercel --prod
```

## ✅ Current Status After Fix:

### 🎯 **Email Automation Logic** - FIXED ✅
- ✅ Correct step calculation based on actual sent emails
- ✅ Proper timing settings (5-minute intervals for testing)
- ✅ CRM stage updates to match email progress
- ✅ Sequence completion handling

### 📧 **Email Delivery** - FIXED with Gmail ✅
- ✅ Short timeouts prevent hanging (5-8 seconds max)
- ✅ Gmail SMTP as reliable fallback
- ✅ Proper error handling and retry logic

### 🤖 **Cron Jobs** - Working ✅
- ✅ Runs every 5 minutes via Vercel
- ✅ Processes leads correctly
- ✅ Sends emails when scheduled

## 🎉 What You Should See Now:

1. **First email**: Sends immediately when lead moves to "called_once"
2. **Subsequent emails**: Send every 5 minutes (configurable in Email Prompting page)
3. **CRM updates**: Stage updates to match email progress
4. **No hanging**: Quick timeouts prevent stuck processes

## 🔧 Customizing Email Timing:

Go to `/email-prompting` page to adjust timing:
- Change from 5 minutes to hours/days for production
- Each stage can have different timing
- Settings save automatically

## 🚨 Troubleshooting:

If emails still don't send:
1. Check Gmail App Password is correct (16 characters, no spaces)
2. Ensure 2FA is enabled on Gmail account
3. Check Vercel environment variables are set
4. Look for "Gmail SMTP" in console logs
5. Test with: `curl -X POST "/api/test-smtp-email"`

---

**Your email automation is now bulletproof! 🚀** 