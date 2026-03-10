# Moving Train Chess Academy - Scheduling System Guide

## Table of Contents
1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Booking Workflow](#booking-workflow)
4. [Payment Flow](#payment-flow)
5. [Admin Features](#admin-features)
6. [Coach Features](#coach-features)
7. [Email Notifications](#email-notifications)
8. [Database Schema](#database-schema)
9. [Setup Instructions](#setup-instructions)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Moving Train Chess Academy Scheduling System is a web application built with Next.js, Supabase, and Resend that allows students to book chess lessons with coaches. The system supports recurring weekly bookings with bank transfer payments via WhatsApp confirmation.

### Key Features
- 📅 **Recurring Bookings**: Students can book 1x or 2x per week sessions
- 💳 **Bank Transfer Payments**: Integrated with WhatsApp for payment confirmation
- 📧 **Email Notifications**: Automated emails for booking status updates
- 👨‍🏫 **Coach Management**: Admin can manage coaches and their availability
- 🔐 **Role-based Access**: Students, Coaches, and Admins with different permissions

---

## User Roles

### 1. Student (Anonymous or Logged-in)
- Browse available coaches
- View coach availability
- Book sessions (1x or 2x per week)
- Receive booking confirmation emails
- Make payments via bank transfer

### 2. Coach
- Set their weekly availability
- View their bookings
- Receive email notifications for new bookings
- Contact students for lesson details

### 3. Admin
- Manage coaches (create, edit, delete)
- Link coaches to user accounts
- View all bookings
- Confirm payments
- Manage coach availability

---

## Booking Workflow

### For Students

```
1. Visit /book page
   └── Browse list of available coaches

2. Select a coach
   └── View coach profile and availability

3. Choose booking frequency
   ├── Once a Week (4 sessions/month) - ₦60,000
   └── Twice a Week (8 sessions/month) - ₦114,000

4. Select days and times
   ├── Day 1: Select day + time slot
   └── Day 2 (optional): Select second day + time slot

5. Fill student information
   ├── Name (required)
   ├── Email (required)
   ├── Phone (optional)
   └── Course type (optional)

6. Submit booking
   └── Receive email with bank details and WhatsApp link
```

### Email Flow for Booking

| Step | Email Type | Recipient | Content |
|------|-----------|-----------|---------|
| 1 | Booking Received | Student | Reservation confirmation + payment details |
| 1 | New Booking | Coach | New booking notification |
| 2 | Payment Confirmed | Student | Payment received, lessons confirmed |
| 2 | Payment Received | Coach | Student paid, booking active |

---

## Payment Flow

### Bank Transfer Method

1. **Student Receives Email** with:
   - Bank: GT Bank
   - Account: 0878016456
   - Account Name: The Moving Train Educational Services Ltd
   - Amount: ₦60,000 or ₦114,000
   - Reference: Booking ID (e.g., "ABC12345")

2. **Student Makes Transfer** and:
   - Takes screenshot of receipt
   - Clicks WhatsApp button in email
   - Sends receipt + booking reference

3. **Admin Confirms Payment** via Dashboard:
   - Goes to /admin/schedule
   - Finds booking in "Awaiting Payment"
   - Clicks "Confirm Payment"
   - Emails sent automatically

### Payment Status Values

| Status | Description |
|--------|-------------|
| `pending_payment` | Booking created, awaiting payment |
| `confirmed` | Payment received, booking active |
| `rejected` | Coach/admin rejected booking |
| `cancelled` | Booking cancelled |

---

## Admin Features

### Managing Coaches (/admin/coaches)

#### Create New Coach
1. Click "Create Coach" button
2. Fill in:
   - **Name** (required): Coach's display name
   - **Specialization**: e.g., "Beginner Training"
   - **Bio**: Brief description
   - **Email**: For booking notifications (important!)
   - **Link to User** (optional): Connect to existing user account
3. Click "Create Coach"

#### Link Coach to User
1. Find coach with "Not linked" status
2. Select user from dropdown "-- Link to user --"
3. System links coach to user account

#### Make Coach Admin
1. Find coach in list
2. Click "Make Admin" button
3. Coach gains admin privileges

### Managing Bookings (/admin/schedule)

#### Confirm Payment
1. Go to "Awaiting Payment" tab
2. Find booking
3. Click "Confirm" button
4. Student and coach receive confirmation emails

#### Reject Booking
1. Find booking
2. Click "Reject" button
3. Optional: Add rejection reason
4. Student receives rejection email

### Managing Availability (/admin/schedule)

1. Click "Availability" tab
2. Select coach from list
3. Use form to add availability:
   - Day of week
   - Start time
   - End time
4. View and delete existing slots

---

## Coach Features

### Setting Availability

Coaches can set their weekly recurring availability:
- Day of the week (Monday-Sunday)
- Time slots (e.g., 10:00 AM - 12:00 PM)
- Multiple slots per day supported

### Viewing Bookings

Coaches receive email notifications for:
- New booking requests
- Payment confirmations

---

## Email Notifications

### Email Templates

| Template | Subject | Trigger |
|----------|---------|---------|
| `studentBookingReceived` | "Your Booking is Reserved! Complete Payment" | Student submits booking |
| `coachNewBooking` | "New Booking - [Student] (Pending Payment)" | New booking created |
| `studentBookingConfirmed` | "Payment Received! Your Lessons Are Confirmed" | Admin confirms payment |
| `coachBookingConfirmed` | "Payment Received - [Student] Confirmed" | Admin confirms payment |
| `studentBookingRejected` | "Update on Your Booking Request" | Booking rejected |

### Bank Details (in emails)
- **Bank**: GT Bank
- **Account Number**: 0878016456
- **Account Name**: The Moving Train Educational Services Ltd

---

## Database Schema

### Tables

#### coaches
```sql
- id (UUID, PK)
- name (TEXT)
- bio (TEXT, nullable)
- specialization (TEXT, nullable)
- photo_url (TEXT, nullable)
- user_id (UUID, FK to auth.users, nullable)
- email (TEXT, nullable) -- For notifications
- is_admin (BOOLEAN, default false)
- created_at (TIMESTAMP)
```

#### availability_slots
```sql
- id (UUID, PK)
- coach_id (UUID, FK)
- day_of_week (INTEGER, 0-6)
- start_time (TEXT, "HH:MM")
- end_time (TEXT, "HH:MM")
- created_at (TIMESTAMP)
```

#### bookings
```sql
- id (UUID, PK)
- coach_id (UUID, FK)
- student_name (TEXT)
- student_email (TEXT)
- student_phone (TEXT, nullable)
- booking_date (DATE)
- start_time (TEXT)
- end_time (TEXT)
- status (TEXT: pending_payment, confirmed, rejected, cancelled)
- course_type (TEXT, nullable)
- notes (TEXT, nullable)

-- Recurring booking fields
- recurring_days (INTEGER[])
- recurring_dates (JSONB)
- monthly_amount (DECIMAL)
- sessions_per_month (INTEGER)
- booking_mode (TEXT: single, double)

-- Payment tracking
- payment_status (TEXT)
- payment_date (TIMESTAMP)
- payment_method (TEXT)
- payment_amount (DECIMAL)
- payment_reference (TEXT)

- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### RLS Policies

The database uses Row Level Security with these policies:

1. **Coaches**: Admins can manage all, coaches can update own profile
2. **Availability**: Public read, coaches manage own
3. **Bookings**: Public insert (for booking), coaches/admins can update

---

## Setup Instructions

### 1. Environment Variables

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
RESEND_API_KEY=re_xxxxxxxx
NEXT_PUBLIC_WHATSAPP_LINK=https://wa.link/xxxxxx
```

### 2. Database Setup

Run migrations in order:
```sql
-- 1. Base schema (schema.sql)
-- 2. Booking flow update (002_update_booking_flow.sql)
-- 3. Fix RLS (003_fix_booking_rls.sql)
-- 4. Recurring bookings (004_recurring_bookings.sql)
-- 5. Payment columns (005_add_payment_columns.sql)
-- 6. Coach email (006_add_coach_email.sql)
-- 7. Get users function (007_get_all_users_function.sql)
-- 8. Fix RLS recursion (012_fix_coach_rls_recursion.sql)
```

### 3. Create Admin User

```sql
-- Make first coach an admin
UPDATE coaches 
SET is_admin = true, 
    user_id = 'auth-user-uuid-here'
WHERE id = 'coach-uuid-here';
```

### 4. Configure Email

1. Sign up at Resend.com
2. Verify domain (themovingtrain.org)
3. Set RESEND_API_KEY in environment
4. Test email at /test-email

---

## Troubleshooting

### Common Issues

#### "No recipient email address" error
**Cause**: Coach has no email set
**Fix**: 
```sql
UPDATE coaches SET email = 'coach@example.com' WHERE id = 'coach-id';
```

#### "Failed to fetch users" error
**Cause**: Missing database function
**Fix**: Run migration `007_get_all_users_function.sql`

#### "Infinite recursion detected in policy"
**Cause**: RLS policy checking coaches table references itself
**Fix**: Run migration `012_fix_coach_rls_recursion.sql`

#### Coach not receiving emails
**Check**:
1. Does coach have email in database?
2. Is email column populated? `SELECT email FROM coaches WHERE id = 'xxx'`
3. Check browser console for email sending logs

#### Payment confirmation not working
**Check**:
1. Are payment columns created? Run `005_add_payment_columns.sql`
2. Check browser console for errors
3. Verify admin has proper RLS permissions

### Debug Mode

Enable verbose logging in browser console:
- All booking operations log to console
- Email sending shows detailed status
- API calls show request/response data

### Reset Database (Development Only)

```sql
-- Clear all bookings
DELETE FROM bookings;

-- Reset coach emails
UPDATE coaches SET email = NULL;

-- Re-run migrations in order
```

---

## Support

For technical support:
1. Check browser console for errors
2. Review Supabase logs
3. Verify all migrations are run
4. Check RLS policies are correct

---

## Roadmap

Future features planned:
- [ ] Paystack/Flutterwave payment integration
- [ ] Calendar view for coaches
- [ ] Student dashboard
- [ ] Lesson notes/homework tracking
- [ ] Automated reminders
- [ ] SMS notifications

---

*Last Updated: February 2026*
