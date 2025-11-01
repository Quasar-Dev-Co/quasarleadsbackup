# 📧 Email Response System - Setup & Troubleshooting Guide

## ✅ Problem Fixed

**Issue:** The email-responses page showed "Failed to load email data" with all stats at 0.

**Root Cause:** The `/api/email-responses/combined` API endpoint was missing (empty directory).

**Solution:** Created the `combined/route.ts` endpoint that fetches incoming emails with their AI responses.

---

## 🔄 How the Email Response System Works

### **1. Email Fetching (IMAP)**
- **Endpoint:** `/api/cron/fetch-incoming-emails`
- **Purpose:** Fetches REPLY emails from your IMAP inbox
- **Frequency:** Should run every 10 minutes via cron
- **Filters:** Only fetches emails from the last 10 minutes that are replies (have "Re:" or reply headers)

### **2. Email Processing (AI Response Generation)**
- **Endpoint:** `/api/cron/process-email-responses`  
- **Purpose:** Generates and sends AI responses to fetched emails
- **Logic:**
  - 1st & 2nd replies → AI-generated personalized response
  - 3rd+ replies → Beautiful Dutch booking template (automatic)

### **3. Frontend Display**
- **Page:** `/email-responses`
- **API:** `/api/email-responses/combined`
- **Shows:** All incoming emails with their AI responses and status

---

## 🚀 Quick Start Testing

### **Option 1: Use Test Panel** (Recommended)
1. Open: `http://localhost:3001/test-email-fetch.html`
2. Click "📬 Fetch Incoming Emails from IMAP"
3. Click "🤖 Process Email Responses (Generate AI)"
4. Click "📊 Check Database for Emails"
5. Refresh the email-responses page

### **Option 2: Manual API Calls**
```bash
# Fetch emails from IMAP
curl -X POST http://localhost:3001/api/cron/fetch-incoming-emails

# Process and generate AI responses  
curl -X POST http://localhost:3001/api/cron/process-email-responses

# Check the data
curl http://localhost:3001/api/email-responses/combined
```

---

## ⚙️ Required Credentials

The system requires these credentials (set in Account Settings → Credentials):

### **IMAP (Email Receiving)**
- `IMAP_HOST` - e.g., `imap.gmail.com`
- `IMAP_PORT` - e.g., `993`
- `IMAP_USER` - Your email address
- `IMAP_PASSWORD` - App password or account password

### **SMTP (Email Sending)**
- `SMTP_HOST` - e.g., `smtp.gmail.com`
- `SMTP_PORT` - e.g., `587` or `465`
- `SMTP_USER` - Your email address
- `SMTP_PASSWORD` - App password or account password

### **AI (Response Generation)**
- `OPENAI_API_KEY` - Your OpenAI API key

---

## 📋 Why Emails Might Not Appear

### **1. No Reply Emails Received**
The system ONLY fetches **REPLY emails** (emails with "Re:" in subject or reply headers).
- ✅ Someone replying to your email sequence → Will be fetched
- ❌ New cold emails → Will NOT be fetched

### **2. Emails Outside Time Window**
Only emails from the **last 10 minutes** are fetched during each cron run.
- If you have older reply emails, manually trigger the cron job
- Or adjust the time window in the code

### **3. Cron Jobs Haven't Run**
The cron jobs need to be triggered either:
- Automatically by Vercel cron (every 10 minutes in production)
- Manually using the test panel or curl commands
- Via the POST endpoints for testing

### **4. Missing Credentials**
If IMAP/SMTP credentials are not set, the system cannot fetch/send emails.
- Check Account Settings → Credentials
- Verify all 9 required credentials are filled

---

## 🎯 Expected Workflow

1. **You send** email sequence to leads (via the CRM system)
2. **Lead replies** to your email
3. **Fetch cron** detects the reply email (runs every 10 min)
4. **Email saved** to database as "unread"
5. **Process cron** generates AI response (runs every 10 min)
6. **AI sends** the response automatically
7. **Status updated** to "responded"
8. **Email appears** on the dashboard

---

## 🔍 Debugging Steps

### **Check 1: Are emails in the database?**
```javascript
// In browser console on /email-responses page
fetch('/api/email-responses/combined')
  .then(r => r.json())
  .then(d => console.log('Emails:', d))
```

### **Check 2: Test IMAP connection**
```bash
curl -X POST http://localhost:3001/api/cron/fetch-incoming-emails
```
Look for:
- ✅ "Successfully connected to IMAP"
- ✅ "Processing emails for user: [your-email]"
- ✅ "Email saved: [subject]"

### **Check 3: Check credentials**
```javascript
// In browser console
fetch('/api/credentials')
  .then(r => r.json())
  .then(d => console.log('Credentials:', d))
```

### **Check 4: Browser console errors**
Open DevTools → Console tab and look for:
- Network errors (failed fetch calls)
- 401/403 errors (authentication issues)
- 500 errors (server-side issues)

---

## 💡 Testing Tips

### **To Test Quickly:**
1. Send yourself a test email
2. Reply to it with "Re: Test" 
3. Wait for cron or manually trigger fetch
4. Check the dashboard

### **To Force Process Old Emails:**
Change the time window in `fetch-incoming-emails/route.ts`:
```typescript
// Line 116-117
const tenMinutesAgo = new Date();
tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10); // Change to -1440 for 24 hours
```

---

## 📊 Success Indicators

You'll know it's working when you see:

✅ **On Email Response Page:**
- Total Emails > 0
- Unread or Responded counts > 0
- Email cards appearing in the inbox

✅ **In Server Logs:**
- "Email saved: [subject]"
- "AI response generated"
- "Email sent successfully"

✅ **In Test Panel:**
- "Found X emails in database"
- "Total new emails: X"
- "Total replies sent: X"

---

## 🛠️ Files Modified/Created

1. **Created:** `/app/api/email-responses/combined/route.ts` - Main data endpoint
2. **Created:** `/test-email-fetch.html` - Testing panel
3. **Created:** This guide

---

## 📞 Need Help?

If you're still seeing issues:
1. Check all 9 credentials are set correctly
2. Use the test panel to manually trigger cron jobs
3. Check browser console for specific error messages
4. Verify you have reply emails in your inbox from the last 10 minutes

The system is now **fully functional** and ready to process incoming email replies! 🎉
