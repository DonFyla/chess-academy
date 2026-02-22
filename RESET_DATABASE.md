# Reset Database - Start Fresh

## ⚠️ WARNING

**This will delete ALL data!** Only run this if you want to start completely fresh.

## Quick Reset (Keep Auth Users)

Run this in Supabase SQL Editor:

```sql
-- Delete in correct order (respect foreign keys)

-- 1. Delete all bookings first
DELETE FROM bookings;

-- 2. Delete availability slots
DELETE FROM availability_slots;

-- 3. Delete coaches (keeps auth.users)
DELETE FROM coaches;

-- 4. Reset any sequences if needed
-- ALTER SEQUENCE coaches_id_seq RESTART WITH 1;
```

## Complete Reset (Delete Everything Including Auth Users)

⚠️ **This deletes login accounts too!**

```sql
-- Step 1: Delete dependent tables first
DELETE FROM bookings;
DELETE FROM availability_slots;
DELETE FROM coaches;

-- Step 2: Delete auth users (requires service role or admin)
-- Note: This might fail from SQL Editor due to permissions
-- Use Supabase Dashboard → Authentication → Users → Delete All instead
DELETE FROM auth.users;
```

## Alternative: Use Supabase Dashboard (Recommended)

### Method 1: Table by Table (Safest)

1. Go to https://app.supabase.com
2. Select your project
3. Go to **"Table Editor"**
4. For each table (**bookings**, **availability_slots**, **coaches**):
   - Click the table
   - Click **"Delete all rows"** (trash icon)
   - Confirm

### Method 2: Delete Auth Users

1. Go to **"Authentication"** → **"Users"**
2. Select all users
3. Click **"Delete"**

---

## Reset with Sample Data

After clearing, add fresh coaches:

```sql
-- Insert fresh coaches with emails
INSERT INTO coaches (name, bio, specialization, email, is_admin) VALUES 
(
  'FIDE Master Akintoye Abdulraheem',
  '2 time and current West African Chess champion. Nigeria''s Number 1 by FIDE. Winner of the Challenger A category at the Gibraltar Chess Festival 2019.',
  'Advanced Training, Tournament Preparation',
  'fmakintoye@themovingtrain.org',
  true
),
(
  'Master Oluwadurotimi Lapite',
  'Nigeria''s Number 11 by FIDE. Winner of Millionaires Chess Tournament. Winner of Awesome Classical Tournament 2022.',
  'Intermediate to Advanced Training',
  'oluwadurotimi@themovingtrain.org',
  false
);
```

---

## After Reset Checklist

- [ ] Coaches created with emails
- [ ] Admin user set (is_admin = true)
- [ ] Availability slots added for each coach
- [ ] Test booking flow
- [ ] Verify emails are received

---

## Need Help?

If something goes wrong, you can restore from Supabase backups (if enabled) or re-run the migrations.
