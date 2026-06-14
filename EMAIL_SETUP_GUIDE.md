# Email Setup Guide - Resend

## Current Status
- ✅ Email API route created (`/api/send-booking-email`)
- ✅ Email templates designed
- ❌ Resend API key not configured
- ❌ Domain not verified

---

## Step 1: Sign Up for Resend

1. Go to https://resend.com
2. Sign up with your email
3. Verify your account

---

## Step 2: Get API Key

1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it "Chess Academy Production"
4. Copy the key (starts with `re_`)

---

## Step 3: Add API Key to Environment

Edit `.env.local` and uncomment/add:

```env
RESEND_API_KEY=re_your_actual_api_key_here
```

---

## Step 4: Verify Domain (Important!)

Resend requires domain verification to send emails from your domain.

### Option A: Verify themovingtrain.org

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter: `themovingtrain.org`
4. Resend will give you DNS records to add
5. Add these DNS records in your domain provider (wherever you bought themovingtrain.org)
6. Wait for verification (can take a few minutes to 24 hours)

### Option B: Use Resend's Default (Testing only)

For testing without domain verification, use Resend's default:
- From: `onboarding@resend.dev`
- Only works for sending to your own email

Update `src/app/api/send-booking-email/route.js`:
```javascript
from: 'onboarding@resend.dev', // For testing
```

---

## Step 5: Test Email Sending

1. Start dev server: `npm run dev`
2. Go to `/admin/schedule`
3. Create a test booking
4. Confirm the booking
5. Check if email is received

---

## Email Flow

```
Student books session → Booking created (pending)
                           ↓
Admin confirms in /admin/schedule
                           ↓
API called: /api/send-booking-email
                           ↓
Resend sends confirmation email to student
                           ↓
Student receives email with WhatsApp payment link
```

---

## Email Templates

### 1. Booking Confirmed Email
- Subject: "Your Chess Lesson Booking is Confirmed! 🎉"
- Includes: Coach name, date, time, payment button

### 2. Booking Rejected Email
- Subject: "Update on Your Chess Lesson Booking"
- Includes: Reason, link to book another time

---

## Troubleshooting

### Issue: "Email service not configured"
**Solution**: Add RESEND_API_KEY to .env.local

### Issue: "Failed to send email"
**Solution**: 
- Check if domain is verified
- Verify API key is correct
- Check Resend dashboard for logs

### Issue: Emails going to spam
**Solution**:
- Complete domain verification
- Add SPF and DKIM records
- Use a recognizable "From" name

---

## Production Checklist

- [ ] Resend account created
- [ ] API key obtained
- [ ] Domain verified (themovingtrain.org)
- [ ] DNS records configured
- [ ] SPF record added
- [ ] DKIM record added
- [ ] Test email sent successfully
- [ ] Email templates reviewed
- [ ] .env.local updated with production key

---

## Costs

Resend pricing:
- **Free tier**: 100 emails/day
- **Pro**: $20/month for 50,000 emails

For a chess academy, the free tier should be sufficient initially.
