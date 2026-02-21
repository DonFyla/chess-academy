# Fix: "Failed to Add Availability" Error

## The Problem
Supabase Row Level Security (RLS) is blocking inserts because you're not authenticated.

## Quick Fix (For Local Testing)

### Option 1: Disable RLS Temporarily (Easiest)

1. Go to your Supabase dashboard: https://app.supabase.com/project/edzugxvyhcgsjfnqknek
2. Click **Table Editor** in left sidebar
3. Click on `availability_slots` table
4. Click on **Authentication** tab (or look for RLS icon)
5. Toggle **Enable RLS** to OFF

Now try adding availability again - it should work!

**Remember:** Re-enable RLS before going to production!

---

### Option 2: Create a Test User (Recommended)

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter:
   - Email: `test@coach.com`
   - Password: `testpassword123`
4. Click **Create user**
5. Copy the user's UUID

6. Go to **Table Editor** → `coaches` table
7. Find FM Akintoye's row
8. Edit and paste the UUID into `user_id` column

Now log in at `http://localhost:3000/coach` with:
- Email: `test@coach.com`
- Password: `testpassword123`

Then go to `/coach/availability` to add your slots.

---

### Option 3: Fix RLS Policies (Proper Solution)

Run this SQL in Supabase SQL Editor:

```sql
-- Drop existing policies on availability_slots
DROP POLICY IF EXISTS "Coaches can manage their own availability" ON availability_slots;
DROP POLICY IF EXISTS "Admins can manage all availability" ON availability_slots;

-- Create a policy that allows inserts for testing
CREATE POLICY "Allow inserts for testing" 
  ON availability_slots FOR INSERT 
  WITH CHECK (true);

-- Keep select open for everyone
CREATE POLICY "Allow select for everyone" 
  ON availability_slots FOR SELECT 
  USING (true);
```

---

## How Coaches Access Their Dashboard

### For Coaches (After Login):
1. Go to `http://localhost:3000/coach`
2. Login with their email/password
3. Click "Manage My Availability"
4. Add their weekly schedule

### For Admin (You):
1. Go to `http://localhost:3000/admin/schedule`
2. Click "Availability" tab
3. Select a coach
4. Add availability slots for them

---

## How to Create Coach Accounts

### Method 1: Via Supabase Dashboard
1. Supabase → Authentication → Users
2. Add user → Create new user
3. Copy the UUID
4. Table Editor → coaches
5. Edit coach row, paste UUID into user_id

### Method 2: Via Admin Panel
1. Go to `/admin/schedule`
2. Click "Coaches" tab
3. Click "Add Coach"
4. Fill in details
5. Then link the user account manually in Supabase

---

## Testing Without Authentication

If you just want to test the booking flow without dealing with auth:

1. **Disable RLS on all tables:**
   ```sql
   ALTER TABLE availability_slots DISABLE ROW LEVEL SECURITY;
   ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
   ALTER TABLE coaches DISABLE ROW LEVEL SECURITY;
   ```

2. Now you can:
   - Add availability from admin panel
   - Create bookings
   - Test the full flow

3. **Re-enable before production:**
   ```sql
   ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
   ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
   ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
   ```

---

## Common Errors

### "new row violates row-level security policy"
**Fix:** Disable RLS or create proper policies

### "JWT expired" or "Invalid JWT"
**Fix:** User not logged in. Go to `/coach` and login first.

### "duplicate key value violates unique constraint"
**Fix:** That time slot already exists for that coach

---

## Quick Checklist

- [ ] RLS disabled on `availability_slots` (for testing) OR
- [ ] Created test user and linked to coach
- [ ] Logged in at `/coach`
- [ ] Can access `/coach/availability`
- [ ] Can add availability slots

---

## Need More Help?

Check browser console (F12) for exact error messages. The error message will tell you which policy is blocking the request.
