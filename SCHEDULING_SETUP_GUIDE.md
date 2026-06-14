# Coach Scheduling System - Setup Guide

## Overview
This guide will walk you through setting up the coach scheduling system for Moving Train Chess Academy.

---

## Step 1: Install Dependencies

Run these commands in your project directory:

```bash
cd Documents/khalil/chess-academy
npm install @supabase/supabase-js @tanstack/react-query date-fns sonner resend
```

Or if using bun:
```bash
cd Documents/khalil/chess-academy
bun add @supabase/supabase-js @tanstack/react-query date-fns sonner resend
```

---

## Step 2: Set Up Supabase Account

### 2.1 Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with your email or GitHub
4. Create a new organization
5. Create a new project called "moving-train-chess"

### 2.2 Get Your API Keys
1. In your Supabase dashboard, go to Project Settings (gear icon)
2. Click on "API" in the left sidebar
3. Copy these values:
   - **Project URL**: `https://xxxxxxxx.supabase.co`
   - **anon public**: `eyJ...` (long string)

### 2.3 Update Environment Variables
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## Step 3: Create Database Tables

### 3.1 Open SQL Editor
1. In Supabase dashboard, click on "SQL Editor" in the left sidebar
2. Click "New query"
3. Copy the contents of `supabase/schema.sql` from this project
4. Paste into the SQL Editor
5. Click "Run"

This will create:
- `coaches` table
- `availability_slots` table
- `bookings` table
- All necessary indexes and security policies
- Seed data with your existing coaches (FM Akintoye and Master Oluwadurotimi)

### 3.2 Verify Tables Created
1. Go to "Table Editor" in the left sidebar
2. You should see three tables: `coaches`, `availability_slots`, `bookings`
3. Check the `coaches` table - it should have 2 rows already

---

## Step 4: Set Up Authentication

### 4.1 Enable Email Authentication
1. In Supabase dashboard, go to "Authentication" → "Providers"
2. Make sure "Email" provider is enabled
3. Under "Authentication" → "URL Configuration", set:
   - Site URL: `https://www.themovingtrain.org`
   - Redirect URLs: Add `https://www.themovingtrain.org/auth/callback`

### 4.2 Create Admin User
1. Go to "Authentication" → "Users"
2. Click "Add user" → "Create new user"
3. Enter admin email and password
4. Click "Create user"
5. Copy the user's UUID

### 4.3 Link Admin to Coach
1. Go to "Table Editor" → `coaches` table
2. Find FM Akintoye's row (or the coach who should be admin)
3. Edit the row and paste the admin user's UUID into the `user_id` column
4. Make sure `is_admin` is set to `true`

---

## Step 5: Set Up Email Service (Resend)

### 5.1 Create Resend Account
1. Go to https://resend.com
2. Sign up with your email
3. Verify your domain or use the default testing domain

### 5.2 Get API Key
1. In Resend dashboard, go to "API Keys"
2. Create a new API key
3. Copy the key (starts with `re_`)

### 5.3 Add to Environment Variables
Add to `.env.local`:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
```

### 5.4 Update From Email
In `src/app/api/send-booking-email/route.js`, update the from address:
```javascript
from: 'Moving Train Chess Academy <bookings@yourdomain.com>',
```

---

## Step 6: Configure Edge Function (Optional)

If you want to use Supabase Edge Functions for emails instead of the Next.js API route:

1. Install Supabase CLI (see: https://supabase.com/docs/guides/cli)
2. Deploy the edge function:
   ```bash
   supabase functions deploy send-booking-confirmation
   ```
3. Set the `RESEND_API_KEY` secret:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
   ```

---

## Step 7: Test the Setup

### 7.1 Start Development Server
```bash
npm run dev
```

### 7.2 Test Pages
1. Visit `http://localhost:3000/book` - Should show list of coaches
2. Click "Book Session" on a coach - Should show booking form
3. Try to submit a booking (won't work without auth yet)

### 7.3 Test Admin Access
1. Visit `http://localhost:3000/admin/schedule`
2. You should be redirected (auth not set up yet)

---

## Step 8: Deploy to Production

### 8.1 Update Environment Variables
Add these to your production environment (Vercel, Netlify, etc.):
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_WHATSAPP_LINK=https://wa.link/uj48gk
```

### 8.2 Update Supabase Auth URLs
1. In Supabase dashboard, go to Authentication → URL Configuration
2. Update Site URL to your production domain
3. Add your production domain to Redirect URLs

### 8.3 Build and Deploy
```bash
npm run build
```

---

## Step 9: Post-Deployment Setup

### 9.1 Create Coach Accounts
For each coach:
1. Sign up at `/auth/signup` (you'll need to create this page)
2. Or use Supabase dashboard to create users
3. Link each user to their coach record via the `user_id` column

### 9.2 Set Coach Availability
1. Coaches log in and visit `/coach/availability`
2. They add their available time slots
3. Or admin can set availability via `/admin/schedule`

---

## New Pages Created

| Page | URL | Purpose |
|------|-----|---------|
| Book Coaches | `/book` | List all coaches |
| Book Coach | `/book/[coachId]` | Booking form for specific coach |
| Coach Dashboard | `/coach/availability` | Coaches manage their availability |
| Admin Dashboard | `/admin/schedule` | Admin manages everything |

---

## Features Implemented

✅ **Student Booking Flow**
- View all coaches
- Select date from calendar
- See available time slots
- Book a session
- Receive email confirmation

✅ **Coach Management**
- Coaches can set weekly availability
- View upcoming bookings
- Manage their schedule

✅ **Admin Dashboard**
- Manage all coaches
- Manage all availability
- Confirm/reject bookings
- View all bookings

✅ **Email Notifications**
- Booking confirmation emails
- WhatsApp payment link in email
- Professional email templates

---

## Next Steps

1. **Add Authentication UI**: Create login/signup pages
2. **Integrate with Tutors Page**: Add "Book Session" buttons
3. **Add to Course Pages**: Add booking CTAs
4. **Test Full Flow**: Make test bookings
5. **Train Coaches**: Show them how to use the system

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs in dashboard
3. Verify environment variables are set correctly
4. Ensure database tables were created properly
