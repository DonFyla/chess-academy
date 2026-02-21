# Production Deployment Checklist

## ⚠️ Critical - Must Do Before Deploy

### 1. Environment Variables

Create production `.env.local` with:

```bash
# Supabase (Use production project or same project)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Resend Email (Production API Key)
RESEND_API_KEY=re_prod_xxxxxxxx

# WhatsApp Payment Link
NEXT_PUBLIC_WHATSAPP_LINK=https://wa.me/234xxxxxxxxxx

# Optional: Analytics, Sentry, etc.
```

**⚠️ Security**: Never commit `.env.local` to git!

---

### 2. Database Setup (Supabase)

Run these migrations in order on production database:

```sql
-- Run in Supabase SQL Editor (Production project)

-- 1. Core recurring booking columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_days INTEGER[];
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_dates JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS monthly_amount DECIMAL(10, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sessions_per_month INTEGER DEFAULT 4;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_mode TEXT DEFAULT 'single';

-- 2. Payment tracking columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2);

-- 3. Coach email column
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_coaches_email ON coaches(email);

-- 4. Create function to get user email
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  RETURN user_email;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_email(UUID) TO authenticated;

-- 5. Create function for admin to get all users
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_metadata JSONB
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data as user_metadata
  FROM auth.users au
  ORDER BY au.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;

-- 6. Fix RLS recursion
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM coaches 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;

-- 7. Update RLS policies
DROP POLICY IF EXISTS "Admins can manage all coaches" ON coaches;
CREATE POLICY "Admins can manage coaches" 
  ON coaches FOR ALL 
  USING (is_current_user_admin());
```

---

### 3. Resend Email Setup

1. **Create Resend Account**: https://resend.com
2. **Verify Domain**: Add `themovingtrain.org` to verified domains
3. **Get API Key**: Copy production API key
4. **Test Email**: Visit `/test-email` on deployed site

**Important**: Free Resend plan limits:
- 100 emails/day
- 1 domain
- Must verify domain for production

---

### 4. WhatsApp Link

Update WhatsApp link to your actual business number:

```
https://wa.me/234XXXXXXXXXX?text=Hi%20Moving%20Train,%20I%20have%20made%20a%20payment
```

Generate at: https://wa.link/ or https://create.wa.link/

---

### 5. Production Data Setup

#### Set Coach Emails (Critical for notifications)

```sql
-- Update with actual coach emails
UPDATE coaches 
SET email = 'fmakintoye@themovingtrain.org' 
WHERE name = 'FIDE Master Akintoye Abdulraheem';

UPDATE coaches 
SET email = 'oluwadurotimi@themovingtrain.org' 
WHERE name = 'Master Oluwadurotimi Lapite';

-- Add more coaches as needed
```

#### Create Admin User

1. Sign up at `/signup`
2. Run SQL to make user admin:
```sql
UPDATE coaches 
SET is_admin = true 
WHERE email = 'admin@themovingtrain.org';
```

#### Set Coach Availability

1. Login as admin
2. Go to `/admin/schedule`
3. Select coach
4. Add availability slots

---

## 🔍 Pre-Launch Testing

### Test Booking Flow
1. Visit `/book` as anonymous user
2. Select coach
3. Choose 1x/week or 2x/week
4. Select days and times
5. Submit booking
6. Check email received with bank details
7. Check coach email received

### Test Payment Confirmation
1. Go to `/admin/schedule`
2. Find booking in "Awaiting Payment"
3. Click "Confirm Payment"
4. Verify both student and coach receive confirmation emails

### Test Coach Availability
1. Go to `/admin/schedule` → Availability tab
2. Add slots for each coach
3. Verify slots appear on booking page

### Test Authentication
1. Sign up at `/signup`
2. Login at `/login`
3. Access admin pages (should work if admin)
4. Logout

---

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Pros**: 
- Easy Next.js deployment
- Automatic preview deployments
- Serverless functions included

**Cons**:
- Function timeout limits (10s hobby, 60s pro)

### Option 2: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### Option 3: Self-Hosted (VPS)

```bash
# Build locally
npm run build

# Upload .next folder to server
# Or use Docker
```

---

## 🔒 Security Checklist

- [ ] Environment variables not in git
- [ ] Supabase RLS policies active
- [ ] Resend domain verified (not using test domain)
- [ ] Admin users properly configured
- [ ] No test data in production
- [ ] HTTPS enabled
- [ ] CORS configured properly

---

## 📊 Post-Launch Monitoring

### Check These After Deployment

1. **Email Delivery**
   - Check Resend dashboard for delivery rates
   - Monitor spam folder issues

2. **Database Performance**
   - Monitor Supabase query performance
   - Check for slow queries

3. **Error Tracking**
   - Set up Sentry or similar
   - Monitor console errors

4. **User Feedback**
   - Test actual bookings
   - Get feedback from coaches

---

## 🐛 Known Issues to Fix Before Launch

### Critical
- [ ] Coach linking in admin (recursion issue) - needs SQL fix
- [ ] Ensure all coaches have emails set
- [ ] Test email delivery with actual addresses

### Nice to Have
- [ ] Add loading states to all buttons
- [ ] Add form validation feedback
- [ ] Add success/error toasts for all actions
- [ ] Mobile responsiveness check

---

## 📝 Summary

**Must Do:**
1. ✅ Run all database migrations
2. ✅ Set coach emails in database
3. ✅ Configure Resend with verified domain
4. ✅ Update WhatsApp link
5. ✅ Test full booking flow
6. ✅ Create admin user

**Estimated Time**: 1-2 hours

**Risk Level**: Medium (test thoroughly before announcing)

---

*Last Updated: February 2026*
