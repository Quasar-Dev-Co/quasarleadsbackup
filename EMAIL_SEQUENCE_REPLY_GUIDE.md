# Email Sequence Reply System

## Overview

The email sequence reply system automatically detects when someone replies to any of the 7 emails in your email automation sequence and generates an AI-powered response.

## How It Works

### 1. Detection
- When an incoming email is received, the system checks if the sender has received any emails from your 7-email sequence in the last 30 days
- If they have, it marks the email as a "sequence reply" and identifies which stage of your sequence they're replying to

### 2. Auto-Response
- For sequence replies, the system automatically:
  - Generates an AI response using a specialized prompt
  - Sends the response immediately
  - Updates the lead status to "replied"
  - Marks the incoming email as "responded"

### 3. Specialized AI Prompt
The AI uses a specialized prompt for sequence replies that:
- Maintains a warm, human tone
- Acknowledges their response genuinely
- Asks follow-up questions to continue the conversation
- Suggests a Zoom call when appropriate
- Uses the exact signature: "Warmly, Team QuasarSEO"

## Email Sequence Stages

The system recognizes these 7 email stages:
1. `called_once` - First email
2. `called_twice` - Second email
3. `called_three_times` - Third email
4. `called_four_times` - Fourth email
5. `called_five_times` - Fifth email
6. `called_six_times` - Sixth email
7. `called_seven_times` - Seventh email

## Database Schema Updates

### IncomingEmail Schema
Added new fields to track sequence replies:
```javascript
metadata: {
  originalEmailStage: String, // Which stage this is replying to
  isReplyToSequence: Boolean  // Whether this is a sequence reply
}
```

### AIResponse Schema
Added new response type:
```javascript
responseType: {
  type: String,
  enum: ['ai_generated', 'fallback', 'sequence_reply'],
  default: 'ai_generated'
}
```

## UI Indicators

In the Email Responses page, sequence replies are marked with:
- **Green "Sequence Reply" badge** with sparkles icon
- **Blue stage badge** showing which email stage they're replying to
- **Sequence Replies counter** in the stats cards

## API Endpoints

### POST /api/email-responses/incoming
Enhanced to detect sequence replies and auto-generate responses.

**Response includes:**
```javascript
{
  success: true,
  emailId: "email_id",
  message: "Incoming email saved and AI response auto-generated.",
  aiResponseGenerated: true,
  originalStage: "called_once",
  isReplyToSequence: true
}
```

## Testing

Use the test script to verify functionality:
```bash
node scripts/test-sequence-reply.js
```

This script:
1. Finds a lead with email history
2. Sends a test reply to the incoming email API
3. Verifies that sequence reply detection works
4. Checks if AI response is auto-generated

## Configuration

### AI Settings
The system uses the AI settings from the database (`aisettings` collection) for:
- OpenAI API key
- Response length limits
- Temperature settings

### Email Service
Uses the existing email service to send responses with:
- From: info@quasarseo.nl
- Subject: "Re: [original subject]"
- HTML formatting

## Error Handling

- If AI response generation fails, the email is still saved but marked as unread
- If email sending fails, the AI response is saved but marked as failed
- All errors are logged for debugging

## Monitoring

Check the logs for:
- `🎯 Detected reply to email sequence!` - Sequence reply detected
- `🤖 Auto-generating AI response for sequence reply` - AI generation started
- `✅ Auto-sent AI response to [email]` - Response sent successfully

## Future Enhancements

1. **Custom Responses per Stage**: Different AI prompts for different sequence stages
2. **Response Templates**: Pre-written responses for common scenarios
3. **Manual Override**: Option to manually review before sending
4. **Analytics**: Track response rates and conversion metrics
5. **A/B Testing**: Test different response strategies

## Troubleshooting

### Common Issues

1. **AI Response Not Generated**
   - Check OpenAI API key configuration
   - Verify AI settings in database
   - Check logs for API errors

2. **Email Not Sent**
   - Verify SMTP configuration
   - Check email service logs
   - Ensure recipient email is valid

3. **Sequence Reply Not Detected**
   - Verify lead has email history
   - Check if emails are within 30-day window
   - Ensure email stages are correct

### Debug Commands

```bash
# Test sequence reply detection
node scripts/test-sequence-reply.js

# Check email responses
curl http://localhost:3000/api/email-responses/incoming

# Check AI responses
curl http://localhost:3000/api/email-responses/ai-responses
``` 