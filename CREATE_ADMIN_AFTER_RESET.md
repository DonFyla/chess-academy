# Create Admin After Database Reset

Since you deleted all users and coaches, here's how to create a new admin:

## Method 1: Step-by-Step (Recommended)

### Step 1: Sign Up as New User

1. Go to your production site: `https://your-site.com/signup`
2. Create an account with your admin email
3. Check email and verify the account
4. Log in

### Step 2: Create Coach Record via SQL

Run this in Supabase SQL Editor:

```sql
-- Get the user ID first (copy this UUID)
SELECT id, email FROM auth.users WHERE email = 'your-admin-email@example.com';
```

Then create the coach:

```sql
-- Replace 'USER_ID_HERE' with the UUID from above query
INSERT INTO coaches (name, email, specialization, is_admin, user_id) 
VALUES (
  'Admin User',
  'your-admin-email@example.com',
  'Administrator',
  true,  -- This makes them admin
  'USER_ID_HERE'  -- Paste the UUID here
);
```

### Step 3: Verify

Refresh the page at `/admin/coaches` - you should now see:
- Your coach record
- "Admin" badge
- Ability to manage other coaches

---

## Method 2: All-in-One SQL (If You Know the Email)

```sql
-- Create admin coach and link to existing auth user in one go
INSERT INTO coaches (name, email, specialization, is_admin, user_id)
SELECT 
  'Admin User',
  au.email,
  'Administrator',
  true,
  au.id
FROM auth.users au
WHERE au.email = 'your-admin-email@example.com'
ON CONFLICT (user_id) DO UPDATE 
SET is_admin = true;
```

---

## Method 3: Using Admin Dashboard (After First Admin)

Once you have one admin, you can:

1. Go to `/admin/coaches`
2. Click "Create Coach"
3. Fill in details
4. Check "Make Admin" (or use the button after creation)

---

## Quick Check: Are You Admin?

Run this SQL to check if your user is an admin:

```sql
SELECT 
  c.name,
  c.email,
  c.is_admin,
  au.email as auth_email
FROM coaches c
JOIN auth.users au ON au.id = c.user_id
WHERE c.is_admin = true;
```

If this returns no rows, you have no admins yet.

---

## Troubleshooting

### "I can't access /admin/coaches"

**Cause**: Your user is not linked to an admin coach record

**Fix**: Run the SQL in Method 1 or 2 above

### "I get 'Admin access required' error"

**Cause**: Coach record exists but `is_admin` is false

**Fix**: 
```sql
UPDATE coaches 
SET is_admin = true 
WHERE email = 'your-email@example.com';
```

### "Coach record exists but can't login"

**Cause**: `user_id` column doesn't match your auth.users ID

**Fix**: Update the user_id:
```sql
-- Get your auth user ID
SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Update coach record
UPDATE coaches 
SET user_id = 'AUTH_USER_ID_HERE'
WHERE email = 'your-email@example.com';
```

---

## Quick Commands Reference

```sql
-- List all coaches
SELECT id, name, email, is_admin, user_id FROM coaches;

-- List all auth users
SELECT id, email, created_at FROM auth.users;

-- Make specific user admin
UPDATE coaches SET is_admin = true WHERE email = 'your-email@example.com';

-- Create coach for existing user
INSERT INTO coaches (name, email, is_admin, user_id)
VALUES ('Coach Name', 'email@example.com', true, 'USER_UUID_HERE');
```

---

## Next Steps After Creating Admin

1. ✅ Create admin user (done above)
2. ⏳ Add other coaches via `/admin/coaches`
3. ⏳ Set coach emails
4. ⏳ Add availability slots for each coach
5. ⏳ Test booking flow
