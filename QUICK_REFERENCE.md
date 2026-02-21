# Quick Reference Card

## Common Tasks

### Add Email to Existing Coach
```sql
UPDATE coaches 
SET email = 'coach@example.com' 
WHERE name = 'Coach Name';
```

### Create New Coach
1. Go to `/admin/coaches`
2. Click "Create Coach"
3. Fill: Name, Email, Specialization, Bio
4. Optional: Link to existing user
5. Submit

### Set Coach Availability
1. Go to `/admin/schedule`
2. Click "Availability" tab
3. Select coach
4. Add slots (Day, Start Time, End Time)

### Fix RLS Issues
Run in Supabase SQL Editor:
```sql
-- Function to check admin status (avoids recursion)
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

-- Apply policy
CREATE POLICY "Admins can manage coaches" 
ON coaches FOR ALL 
USING (is_current_user_admin());
```

### Test Email
Visit: `https://your-site.com/test-email`

### Database Functions Needed
```sql
-- Get user email from auth.users
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
```

## File Structure
```
src/
├── app/
│   ├── admin/
│   │   ├── coaches/page.jsx      # Manage coaches
│   │   └── schedule/page.jsx     # Manage bookings/availability
│   ├── api/
│   │   ├── admin/users/route.js  # Get users API
│   │   └── send-booking-email/   # Email API
│   └── book/
│       └── [coachId]/page.jsx    # Booking page
├── components/scheduling/
│   ├── BookingForm.jsx           # Student booking form
│   └── AddAvailabilityForm.jsx   # Coach availability form
└── hooks/
    ├── useBookings.js            # Booking CRUD
    ├── useCoaches.js             # Coach CRUD
    └── useAvailability.js        # Availability CRUD

supabase/migrations/
├── 004_recurring_bookings.sql    # Core booking columns
├── 005_add_payment_columns.sql   # Payment tracking
├── 006_add_coach_email.sql       # Coach email column
└── 012_fix_coach_rls_recursion.sql # RLS fix
```

## Email Templates
Located in: `src/app/api/send-booking-email/route.js`

Templates:
- `studentBookingReceived` - First email after booking
- `coachNewBooking` - Notify coach of new booking
- `studentBookingConfirmed` - Payment confirmed (student)
- `coachBookingConfirmed` - Payment confirmed (coach)
- `studentBookingRejected` - Booking rejected

## Key Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_WHATSAPP_LINK=
```

## Pricing
| Plan | Sessions | Price | Discount |
|------|----------|-------|----------|
| Single | 4/month | ₦60,000 | - |
| Double | 8/month | ₦114,000 | 5% |

## Status Flow
```
Student Books → pending_payment
Admin Confirms → confirmed
Admin Rejects → rejected
Student Cancels → cancelled
```
