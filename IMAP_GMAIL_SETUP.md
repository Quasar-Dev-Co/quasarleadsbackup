# 📧 Gmail IMAP Fallback Setup Guide

## 🚨 Problem Identified

Your primary mail server (`mail.zxcs.nl`) is currently **blocked by firewall/network restrictions**:
- ❌ IMAP Port 993: Timeout (blocked)
- ❌ SMTP Port 465: Timeout (blocked)

## ✅ Solution: Gmail IMAP Fallback

The system now automatically falls back to Gmail IMAP when the primary server is unavailable.

## 📋 Step 1: Set Up Gmail App Password

### 1.1 Enable 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click **Security** → **2-Step Verification**
3. Follow the setup process

### 1.2 Generate App Password
1. Go to **Security** → **2-Step Verification** → **App passwords**
2. Select **Mail** and **Other (Custom name)**
3. Name it: `QuasarLeads Email System`
4. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

## 📋 Step 2: Configure Environment Variables

### 2.1 Local Development (.env.local)
```bash
# Gmail IMAP Fallback Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop

# Alternative variable names (also supported)
FALLBACK_EMAIL_USER=your-email@gmail.com
FALLBACK_EMAIL_PASSWORD=abcdefghijklmnop
```

### 2.2 Vercel Production Environment
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `GMAIL_USER` | your-email@gmail.com | Production |
| `GMAIL_APP_PASSWORD` | your-16-char-password | Production |

## 📋 Step 3: Set Up Email Forwarding (Recommended)

### 3.1 Forward QuasarSEO Emails to Gmail
1. Log into your QuasarSEO email admin panel
2. Set up email forwarding rule:
   - **From:** `info@quasarseo.nl`
   - **To:** `your-gmail@gmail.com`
   - **Keep original:** Yes (optional)

### 3.2 Alternative: Contact Email Provider
Ask your email provider to forward all emails from `info@quasarseo.nl` to your Gmail account.

## 📋 Step 4: Test the Setup

### 4.1 Test Gmail Connection
```bash
# Run the diagnostic script
node scripts/diagnose-imap-connection.js
```

### 4.2 Test Email Fetching
```bash
# Test the API endpoint
curl -X POST "http://localhost:3000/api/cron/fetch-incoming-emails"
```

### 4.3 Expected Output
```
✅ Connected to Gmail Fallback
📊 Found X unseen emails
✅ Successfully processed emails using Gmail Fallback
```

## 🔄 How It Works

### Automatic Fallback Process:
1. **Primary Attempt:** Try connecting to `mail.zxcs.nl:993`
2. **Fallback:** If primary fails, try Gmail `imap.gmail.com:993`
3. **Email Processing:** Process emails from whichever server works
4. **Forwarded Email Detection:** Automatically detect forwarded emails

### Email Flow with Forwarding:
```
Client Reply → info@quasarseo.nl → Gmail (forwarded) → IMAP Fetch → AI Response
```

## 🛠️ Advanced Configuration

### Multiple Fallback Options
The system supports multiple fallback configurations:

```bash
# Primary (QuasarSEO)
IMAP_HOST=mail.zxcs.nl
IMAP_PORT=993
IMAP_USER=info@quasarseo.nl
IMAP_PASSWORD=your-password

# Fallback 1 (Gmail)
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Fallback 2 (Alternative)
FALLBACK_EMAIL_USER=backup@gmail.com
FALLBACK_EMAIL_PASSWORD=backup-app-password
```

## 🔍 Troubleshooting

### Gmail Connection Issues
1. **"Authentication failed"**
   - Verify 2FA is enabled
   - Regenerate App Password
   - Check username/password

2. **"Connection timeout"**
   - Check internet connection
   - Verify Gmail IMAP is enabled
   - Try different network

3. **"No emails found"**
   - Check email forwarding setup
   - Verify emails are in Gmail inbox
   - Check Gmail filters/labels

### Forwarded Email Detection
The system automatically detects forwarded emails by looking for:
- `From:` headers in email content
- Forwarding signatures
- Original sender information

## 📊 Monitoring

### Check System Status
```bash
# View recent logs
curl "http://localhost:3000/api/cron/fetch-incoming-emails"

# Check which server is being used
# Look for: "Server Used: Gmail Fallback" in response
```

### Vercel Function Logs
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Functions** → **View Function Logs**
4. Look for IMAP connection messages

## 🎯 Benefits of Gmail Fallback

### ✅ Advantages:
- **Reliable:** Gmail has 99.9% uptime
- **Fast:** Google's infrastructure is optimized
- **Secure:** Enterprise-grade security
- **Accessible:** Works from any network
- **Free:** No additional costs

### ⚠️ Considerations:
- **Forwarding Delay:** 1-2 minute delay for forwarded emails
- **Gmail Limits:** 2.5GB/day bandwidth (more than sufficient)
- **Setup Required:** One-time configuration needed

## 🚀 Next Steps

1. **Set up Gmail App Password** (5 minutes)
2. **Configure environment variables** (2 minutes)
3. **Set up email forwarding** (5 minutes)
4. **Test the system** (2 minutes)
5. **Deploy to production** (1 minute)

**Total setup time: ~15 minutes**

## 📞 Support

If you need help with any step:
1. Check the diagnostic script output
2. Review Vercel function logs
3. Test Gmail connection manually
4. Verify email forwarding is working

The system will automatically use whichever email server is available, ensuring your email automation never stops working! 🎉 