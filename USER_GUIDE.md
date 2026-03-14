# Chess Academy Platform - User Guide

Complete documentation for Students, Coaches, and Administrators.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Student Guide](#student-guide)
3. [Coach Guide](#coach-guide)
4. [Admin Guide](#admin-guide)
5. [Booking System Explained](#booking-system-explained)
6. [Points System](#points-system)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### For Students

#### Option A: With Account (Flexible Booking with Points)
1. **Sign up** at `/signup` with your email
2. **Confirm your email** (check spam folder)
3. **Buy points** at `/buy-points` (₦10,000 per point)
4. **Book a coach** at `/book-with-points` or `/book-elite`
5. **Check your dashboard** at `/dashboard` for bookings

#### Option B: Without Account (Monthly Subscription)
1. **Go directly** to `/book` - no signup needed!
2. **Choose a coach** and select weekly schedule
3. **Pay ₦40,000** (4 classes) or ₦76,000 (8 classes)
4. **WhatsApp receipt** to confirm
5. **Start learning** - receive email with meeting links

### For Coaches
1. **Contact admin** to get coach account created
2. **Log in** at `/login`
3. **Set your availability** at `/coach/availability`
4. **View your schedule** to see student bookings
5. **Join classes** using your meeting link

### For Admins
1. **Log in** with admin account
2. **Access admin panel** at `/admin/schedule`
3. **Manage coaches, bookings, and points**

---

## Student Guide

### Account Management

#### Creating an Account
1. Go to `/signup`
2. Enter your:
   - Full name
   - Email address
   - Phone number (optional but recommended)
   - Password (min 6 characters)
3. Complete reCAPTCHA verification
4. Check your email for confirmation link
5. Click the link to activate your account

#### Logging In
1. Go to `/login`
2. Enter your email and password
3. Click "Sign In"

#### Resetting Password
1. On login page, click "Forgot Password"
2. Enter your email
3. Check email for reset link
4. Set new password

---

### Buying Points

#### What Are Points?
Points are the currency used to book chess classes:
- **1 point** = 1 class with a regular coach
- **2 points** = 1 class with an elite coach (FIDE Masters)
- Points cost **₦10,000 each**
- Points are valid for **1 year**

#### How to Buy Points
1. Go to `/buy-points` or click "Buy Points" in dashboard
2. Choose a package:
   - 1 point: ₦10,000
   - 4 points: ₦38,000 (5% savings)
   - 8 points: ₦72,000 (10% savings)
   - 12 points: ₦102,000 (15% savings)
   - 20 points: ₦160,000 (20% savings)
3. Or enter custom amount (minimum 1 point)
4. Make bank transfer to:
   - **Bank:** GT Bank
   - **Account:** 0878016456
   - **Name:** The Moving Train Educational Services Ltd
5. Send payment receipt via WhatsApp
6. Points will be added to your account within 24 hours

#### Checking Your Balance
- View balance on your **Dashboard** (`/dashboard`)
- Balance shows at top of page
- Transaction history available in "Transactions" tab

---

### Booking Classes

#### Option 1: Regular Coaches (1 point/class)

1. Go to `/book-with-points` or click "Book a Class" in dashboard
2. Browse available coaches
3. Click "Book with Points" on your chosen coach
4. Select available time slots:
   - Click on days of the week
   - Choose time slots
   - Select up to 10 sessions at once
5. Review booking summary
6. Click "Book [X] Session(s)"
7. Points are deducted immediately
8. Confirmation email sent with meeting link

#### Option 2: Elite Coaches (2 points/class)

1. Go to `/book-elite` or click "Elite Coaches" in dashboard
2. Browse elite coaches (FIDE Masters, National Champions)
3. Click "Book with Points"
4. Select time slots (same as regular coaches)
5. Each session costs 2 points
6. Complete booking

#### Option 3: Monthly Subscription - No Account Needed! (₦40,000/month)

**Best for:** Students who want a fixed schedule and don't want to manage points

**Key Benefits:**
- ✅ No account creation required
- ✅ No login needed
- ✅ Fixed weekly schedule (same day/time each week)
- ✅ Bank transfer payment

**How to Book:**
1. Go to `/book` - no need to log in!
2. Click "Book a Session" from the main menu
3. Browse and select a coach
4. Choose your schedule:
   - **Once a week:** 4 sessions/month for ₦40,000
   - **Twice a week:** 8 sessions/month for ₦76,000 (5% discount)
5. Enter your details (name, email, phone)
6. Complete booking form
7. Make bank transfer to GT Bank: 0878016456
8. Send payment receipt via WhatsApp
9. Admin confirms payment and activates your subscription
10. Receive confirmation email with meeting links

**Important Notes:**
- You'll use your **email** to identify yourself (not a login)
- Classes are on the same day/time each week
- Payment must be made monthly to continue
- Cancellations: Contact admin via WhatsApp

---

### Managing Your Bookings

#### Viewing Bookings
1. Go to `/dashboard`
2. "Upcoming" tab shows confirmed future classes
3. "History" tab shows past and cancelled classes

#### Cancelling a Booking
1. Go to `/dashboard`
2. Find booking in "Upcoming" tab
3. Click "Cancel & Refund"
4. Confirm cancellation
5. **Important:** Must cancel at least 24 hours before class for full refund
6. Points are refunded immediately
7. **Coach is automatically notified** of the cancellation

#### What You Can See
- Coach name and specialization
- Date and time of each session
- Meeting link (for online classes)
- Status (confirmed, completed, cancelled)
- Points used

---

### Payment Methods

#### For Point Purchases
- Bank transfer to GT Bank
- WhatsApp confirmation required

#### For Monthly Subscriptions
- Bank transfer to GT Bank
- WhatsApp receipt to confirm

---

## Coach Guide

### Getting Started

#### Account Setup
1. Admin creates your coach account
2. You receive login credentials via email
3. Log in at `/login`
4. Complete your profile:
   - Add bio
   - Upload photo
   - Add meeting link (Zoom/Google Meet)
   - Set specialization

#### Setting Your Availability

1. Go to `/coach/availability`
2. Select days of the week you're available
3. Set time slots for each day:
   - Click "Add Time Slot"
   - Select start time
   - Select end time
   - Save
4. Add multiple slots per day if needed
5. Block specific dates if unavailable:
   - Go to "Blocked Dates"
   - Select dates you'll be away
   - Students won't be able to book these dates

#### Managing Your Schedule

1. Go to `/coach` (Coach Portal)
2. View all your upcoming classes
3. See:
   - Student name and contact
   - Date and time
   - Class type (points or subscription)
   - Meeting link reminder

---

### Working with Students

#### Before Class
1. Check your schedule daily
2. Ensure your meeting link is working
3. Review student notes if any

#### During Class
1. Join meeting on time
2. Use the allocated time fully
3. Take notes on student progress

#### After Class
1. Mark attendance (admin can update status)
2. Prepare for next class

---

### Receiving Payments

#### For Point Bookings
- Students pay academy directly
- Academy pays coaches monthly (arrange with admin)

#### For Special Coaching (₦15,000/session)
- Direct payment arrangement
- Student pays via bank transfer
- WhatsApp receipt confirmation

---

## Admin Guide

### Admin Dashboard

#### Accessing Admin Panel
1. Log in with admin account
2. Go to `/admin/schedule`
3. Access all admin functions from sidebar

#### Overview
Admin panel includes:
- **Schedule Management** - View all bookings
- **Coach Management** - Add/edit coaches
- **Classes** - View and manage all classes
- **Points Management** - Add points to users

---

### Managing Bookings

#### Viewing All Bookings
1. Go to `/admin/schedule`
2. See all bookings in calendar/list view
3. Filter by:
   - Coach
   - Status (pending, confirmed, cancelled)
   - Date range

#### Confirming Payments

**For Monthly Subscriptions:**
1. Find booking in admin panel
2. Check if payment receipt received via WhatsApp
3. Click "Confirm Payment"
4. Status changes to "confirmed"
5. Confirmation emails sent automatically

**For Point Purchases:**
1. Receive WhatsApp payment receipt
2. Go to `/admin/points`
3. Find user by email
4. Click "Add Points"
5. Enter amount purchased
6. Click "Add Points"
7. Points added immediately

#### Rejecting Bookings
1. Find booking in admin panel
2. Click "Reject"
3. Add reason for rejection
4. Student receives rejection email

#### Cancelling Bookings
1. Find booking
2. Click "Cancel"
3. Refunds processed automatically

---

### Managing Coaches

#### Adding a New Coach
1. Go to `/admin/coaches`
2. Click "Add Coach"
3. Fill in details:
   - Name
   - Email
   - Specialization
   - Bio
   - Photo URL
   - Hourly rate (for special coaching)
   - Points cost (usually 1 for regular, 2 for elite)
   - Is Special? (check for FIDE Masters)
   - Rank/Title
   - Achievements
4. Save
5. Coach receives email with login instructions

#### Editing Coach Details
1. Go to `/admin/coaches`
2. Find coach in list
3. Click "Edit"
4. Update information
5. Save

#### Setting Coach as Admin
1. Edit coach profile
2. Check "Is Admin" box
3. Save
4. Coach now has admin access

---

### Managing Points

#### Adding Points to User
1. Go to `/admin/points`
2. Search for user by email
3. Click "Add Points"
4. Enter:
   - Amount (number of points)
   - Payment reference (from bank transfer)
   - Description (optional)
5. Click "Add Points"
6. Points added immediately
7. User receives confirmation email

#### Viewing Point Transactions
1. Go to `/admin/points`
2. See all point purchases
3. Filter by user, date, or status

---

### Viewing Reports

#### Audit Log
1. All booking changes are logged
2. View who made changes and when
3. Access via database (table: `audit_log`)

#### Analytics
- Total bookings per coach
- Revenue generated
- Points sold
- Most popular time slots

---

## Booking System Explained

### Three Types of Bookings - Which is Right for You?

| Feature | Point-Based | Monthly Subscription | Special Coaching |
|---------|-------------|---------------------|------------------|
| **Account Required** | ✅ Yes | ❌ No | ❌ No |
| **Login Needed** | ✅ Yes | ❌ No | ❌ No |
| **Payment Method** | Points | Bank Transfer | Bank Transfer |
| **Cost** | ₦10,000/point | ₦40K-76K/month | ₦15K/session |
| **Flexibility** | Any slot | Fixed weekly | Any slot |
| **Coach Type** | Any | Regular | Elite Only |
| **Best For** | Flexible learners | Regular students | Serious players |

---

#### 1. Point-Based Booking (Account Required)
- **Who:** Students with registered accounts
- **Payment:** Points (₦10,000 per point)
- **Cost:** 1 point (regular) or 2 points (elite) per class
- **Flexibility:** Book any available slot, any coach
- **Cancellation:** Full refund if cancelled >24h before class
- **Requires:** Login and points balance

#### 2. Monthly Subscription (NO Account Needed!) ⭐
- **Who:** Any student - **no account or login required!**
- **Payment:** Bank transfer
- **Cost:** ₦40,000 (4 classes/month) or ₦76,000 (8 classes/month)
- **Schedule:** Fixed weekly schedule (same day/time each week)
- **Booking:** Just enter your email on the booking form
- **Best For:** Students who want consistency without managing points

#### 3. Special Coaching - Elite Coaches (NO Account Needed!)
- **Who:** Any student - **no account or login required!**
- **Payment:** Bank transfer
- **Cost:** ₦15,000 per session with FIDE Masters
- **Target:** Serious students, executives, gifted children
- **Booking:** Direct booking form at `/special-coaches`

---

## Points System

### How Points Work

| Coach Type | Cost | Description |
|------------|------|-------------|
| Regular Coach | 1 point | Certified coaches (₦10,000/class) |
| Elite Coach | 2 points | FIDE Masters & experts (₦20,000/class) |

### Point Packages (Best Value)

| Points | Price | Savings |
|--------|-------|---------|
| 1 | ₦10,000 | - |
| 4 | ₦38,000 | 5% |
| 8 | ₦72,000 | 10% |
| 12 | ₦102,000 | 15% |
| 20 | ₦160,000 | 20% |

### Point Rules
- Valid for **1 year** from purchase
- Fully refundable if booking cancelled >24h before class
- No refund for no-shows or late cancellations
- Can book multiple classes at once

---

## Troubleshooting

### For Students

#### Can't Log In
- Check email confirmation link was clicked
- Try resetting password
- Check caps lock
- Clear browser cache

#### Points Not Added
- Wait up to 24 hours after payment
- Check WhatsApp message was sent with receipt
- Contact admin with payment reference

#### Can't Book a Slot
- Slot might be already booked (try another time)
- Insufficient points (buy more points)
- Coach might have blocked that date

#### Didn't Receive Confirmation Email
- Check spam/junk folder
- Check email address is correct in profile
- Contact admin

### For Coaches

#### Can't Set Availability
- Make sure you're logged in as coach (not student account)
- Contact admin if you don't have coach access

#### Student Didn't Show Up
- Mark as "no show" in admin panel
- Student doesn't get refund

### For Admins

#### Booking Conflict
- Check unified schedule shows all bookings
- Verify RLS policies are active
- Run migration 038 if needed

#### Email Not Sending
- Check Resend API key is configured
- Check email logs in Resend dashboard
- Verify from address is verified

#### Rate Limiting Not Working
- Check Upstash Redis is configured
- Verify env vars are set in Vercel
- Check logs for connection errors

---

## Contact & Support

- **Website:** https://www.themovingtrain.org
- **WhatsApp:** [Payment Confirmations]
- **Email:** info@themovingtrain.org

---

## FAQ

**Q: Can I get a refund on points?**
A: Points are refundable if you cancel a booking more than 24 hours before the class.

**Q: Can I change my coach?**
A: Cancel your current booking (if >24h notice) and book with a different coach.

**Q: How long are points valid?**
A: Points expire 1 year from purchase date.

**Q: Can I share my account?**
A: No, each student should have their own account.

**Q: What if I'm late for a class?**
A: Coaches work strictly with time. Late arrivals may lose that portion of the class.

**Q: Can I reschedule?**
A: Yes, once per month with at least 12 hours notice.

---

*Last Updated: March 2025*
*Version: 1.0*
