# Quick Start - Scheduling System is Ready! 🚀

## ✅ What I Just Did

1. **Created `.env.local`** with your Supabase credentials
2. **Created all missing UI components:**
   - Calendar (date picker)
   - Card, Input, Label, Textarea
   - Badge, Tabs, Table
3. **Created setup script** (`setup-scheduling.bat`)

---

## 🚀 Run These Commands (in order)

### Step 1: Install Dependencies
Open terminal in your project folder and run:

```bash
cd Documents/khalil/chess-academy
npm install @supabase/supabase-js @tanstack/react-query date-fns sonner react-day-picker @radix-ui/react-label @radix-ui/react-tabs lucide-react class-variance-authority clsx tailwind-merge --legacy-peer-deps
```

Or simply double-click: `setup-scheduling.bat`

### Step 2: Set Up Database (in Supabase)

1. Go to https://app.supabase.com/project/edzugxvyhcgsjfnqknek
2. Click **SQL Editor** in left sidebar
3. Click **New query**
4. Copy ALL contents from `supabase/schema.sql` (in your project folder)
5. Paste into SQL Editor
6. Click **Run**

### Step 3: Start Dev Server
```bash
npm run dev
```

### Step 4: Test
Open browser to:
- `http://localhost:3000/book` - See coaches
- `http://localhost:3000/admin/schedule` - Admin dashboard

---

## 🔧 If You Get Errors

### Error: "Cannot find module 'xxx'"
Run the install command again:
```bash
npm install @supabase/supabase-js @tanstack/react-query date-fns sonner react-day-picker @radix-ui/react-label @radix-ui/react-tabs lucide-react --legacy-peer-deps
```

### Error: "Missing shadcn components"
The components I created should work, but if you have issues:
```bash
npx shadcn-ui@latest add calendar tabs card badge table input label textarea
```

### Error: "Table doesn't exist"
You forgot to run the SQL schema. Go back to Step 2 above.

---

## 📝 Your Environment File (.env.local)

The file is already created with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://edzugxvyhcgsjfnqknek.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkenVneHZ5aGNnc2pmbnFrbmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjMwMzcsImV4cCI6MjA4NjczOTAzN30.UZFzj6IJv58EuN9mZjjK4kSx6sx7SsqSqDgyOz3znPg
```

---

## 🧪 Test Checklist

After starting the dev server:

- [ ] Visit `http://localhost:3000/book`
- [ ] See FM Akintoye and Master Oluwadurotimi listed
- [ ] Click "Book Session" on a coach
- [ ] Go to `http://localhost:3000/admin/schedule`
- [ ] Click "Availability" tab
- [ ] Select a coach and add availability (Monday 10:00-12:00)
- [ ] Go back to booking page
- [ ] Select a Monday date
- [ ] See the time slot appear
- [ ] Fill form and submit booking
- [ ] Go to admin → Bookings tab
- [ ] See your booking and click "Confirm"

---

## 📧 Email Notifications (Optional)

To enable email confirmations:

1. Go to https://resend.com and sign up
2. Get your API key
3. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_your_key_here
   ```
4. Restart dev server

Without this, everything works except the email notifications.

---

## 🆘 Need Help?

If something doesn't work:

1. Check browser console for errors (F12 → Console)
2. Check terminal for server errors
3. Verify Supabase credentials in `.env.local`
4. Make sure database tables exist in Supabase Table Editor

---

**You're all set! Run those commands and test it out!** 🎉
