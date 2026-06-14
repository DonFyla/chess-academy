# Local Testing Guide - Coach Scheduling System

## Prerequisites
- Node.js installed
- Your existing chess academy project working locally

---

## Step 1: Install Dependencies

Open terminal in your project folder:

```bash
cd Documents/khalil/chess-academy
npm install @supabase/supabase-js @tanstack/react-query date-fns sonner
```

If you get any errors, try:
```bash
npm install @supabase/supabase-js @tanstack/react-query date-fns sonner --legacy-peer-deps
```

---

## Step 2: Create Supabase Account (Free)

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with email or GitHub (free tier is fine for testing)
4. Create a new organization (call it "Moving Train Test")
5. Create a new project:
   - Name: `moving-train-chess-test`
   - Database Password: (generate a secure one, save it)
   - Region: Choose closest to Nigeria (probably Frankfurt or London)

Wait for the project to be created (takes 1-2 minutes).

---

## Step 3: Get Your API Keys

1. In your Supabase dashboard, click the "Settings" icon (gear) on left sidebar
2. Click "API" in the settings menu
3. You'll see two important values:
   - **Project URL**: `https://xxxxxxxx.supabase.co`
   - **anon public**: `eyJ...` (long string)

Copy both of these - you'll need them in the next step.

---

## Step 4: Set Up Environment Variables

1. In your project folder, create a file called `.env.local`:
   ```bash
   # Windows
   copy .env.example .env.local
   
   # Mac/Linux
   cp .env.example .env.local
   ```

2. Open `.env.local` and add your Supabase credentials:
   ```env
   # Existing variables (keep these)
   NEXT_PUBLIC_API_URL=http://localhost:8000/questionnaire/api

   # NEW: Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

   # NEW: Email (we'll skip this for now in local testing)
   # RESEND_API_KEY= (leave empty for now)
   ```

   Replace `your-project-url` and `your-anon-key-here` with the values from Step 3.

---

## Step 5: Create Database Tables

1. In Supabase dashboard, click "SQL Editor" in the left sidebar
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql` from this project
4. Paste it into the SQL Editor
5. Click "Run" (top right)

You should see "Success. No rows returned" at the bottom.

### Verify Tables Created:
1. Click "Table Editor" in the left sidebar
2. You should see three tables:
   - `coaches` 
   - `availability_slots`
   - `bookings`
3. Click on `coaches` - you should see 2 rows (FM Akintoye and Master Oluwadurotimi)

---

## Step 6: Start Development Server

```bash
npm run dev
```

Your app should start at `http://localhost:3000`

---

## Step 7: Test the Scheduling System

### Test 1: View Coaches List
1. Open browser to `http://localhost:3000/book`
2. You should see both coaches listed
3. Check that their names and specializations appear

### Test 2: Booking Form
1. Click "Book Session" on one of the coaches
2. You should see:
   - Coach profile at top
   - Calendar on left
   - "No availability set" message (because we haven't added any yet)

### Test 3: Add Availability (as Admin)
1. Go to `http://localhost:3000/admin/schedule`
2. You should see tabs: "Bookings", "Coaches", "Availability"
3. Click "Availability" tab
4. Select a coach from the list
5. Add availability:
   - Day: Monday
   - Start Time: 10:00
   - End Time: 12:00
   - Click "Add Slot"
6. You should see the slot appear below

### Test 4: Book a Session (as Student)
1. Go back to `http://localhost:3000/book`
2. Click "Book Session" on the coach you just added availability for
3. You should now see:
   - Calendar with Monday highlighted as available
4. Click a Monday date
5. You should see time slots (10:00 AM - 12:00 PM)
6. Click the time slot
7. Fill in the form:
   - Name: Test Student
   - Email: your-email@gmail.com
   - Phone: +234...
   - Course: Beginner
   - Notes: Test booking
8. Click "Request Booking"
9. You should see a success toast message

### Test 5: View Booking (as Admin)
1. Go back to `http://localhost:3000/admin/schedule`
2. Click "Bookings" tab
3. You should see your test booking in "Pending Bookings"
4. Click "Confirm" button
5. Booking should move to "Confirmed Bookings"

---

## Step 8: Check Database

In Supabase dashboard:
1. Go to "Table Editor"
2. Click `bookings` table
3. You should see your test booking with status "confirmed"

---

## Troubleshooting

### Issue: "Failed to fetch" or connection errors
- Check that your `.env.local` has the correct Supabase URL and key
- Make sure there are no spaces around the `=` in env variables
- Restart the dev server after changing env variables

### Issue: "No availability set" even after adding
- Refresh the page
- Check that you selected the correct coach
- Check in Supabase Table Editor that the slot was saved

### Issue: Tables not created
- Make sure you ran the SQL in the SQL Editor
- Check for any error messages in the SQL Editor output

### Issue: Build errors
- Make sure all dependencies are installed:
  ```bash
  npm install
  ```
- Check that you're in the right folder (`Documents/khalil/chess-academy`)

---

## What Works Without Email

Even without setting up Resend email service, you can test:
- ✅ Viewing coaches
- ✅ Adding availability
- ✅ Creating bookings
- ✅ Confirming/rejecting bookings
- ✅ Viewing booking lists

The only thing that won't work is the email notifications (which is fine for local testing).

---

## Next: Add Email for Full Testing (Optional)

If you want to test emails locally:

1. Go to https://resend.com
2. Sign up (free tier)
3. Get API key
4. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_xxxxxxxx
   ```
5. Restart dev server
6. Now when you confirm a booking, it will send an email

---

## Quick Test Checklist

- [ ] Install dependencies
- [ ] Create Supabase project
- [ ] Copy API keys to `.env.local`
- [ ] Run SQL schema
- [ ] Start dev server
- [ ] Visit `/book` - see coaches
- [ ] Visit `/admin/schedule` - add availability
- [ ] Book a session as student
- [ ] Confirm booking as admin
- [ ] Check data in Supabase tables

---

Once everything works locally, you can deploy to production!
