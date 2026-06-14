# Comprehensive Test Plan - Booking System Changes

## Summary of Changes Made
1. **Book a Class** (`/book-with-points`): Now shows ONLY regular coaches (1 point/class)
2. **Elite Coaches** (`/book-elite`): New page for registered users to book elite coaches with points (2-3 points/class)
3. **Special Coaches** (`/special-coaches`): Unchanged - still for guest users with ₦ pricing
4. **Conflict Detection**: Fixed to check across all booking types

---

## 1. Dashboard Navigation Tests

### Test 1.1: Book a Class Card
**Steps:**
1. Log in as a registered user
2. Go to `/dashboard`
3. Click "Book a Class" card

**Expected:**
- Navigates to `/book-with-points`
- Page shows only regular coaches (is_special = false)
- No elite coaches (FIDE Masters) should appear
- Shows "Regular Coach (1 point)" in legend

### Test 1.2: Elite Coaches Card
**Steps:**
1. Log in as a registered user
2. Go to `/dashboard`
3. Click "Elite Coaches" card

**Expected:**
- Navigates to `/book-elite`
- Page shows only elite/special coaches (is_special = true)
- Shows user's points balance at the top
- Shows points cost (2-3 points) not ₦ pricing

---

## 2. Book a Class Page Tests (`/book-with-points`)

### Test 2.1: Coach List Filtering
**Steps:**
1. Go to `/book-with-points`

**Expected:**
- Only regular coaches displayed (is_special = false)
- Elite coaches (like FM or IM titled coaches) should NOT appear
- Each coach shows 1 point cost

### Test 2.2: Booking Flow
**Steps:**
1. Click "Book with Points" on a regular coach
2. Select time slots
3. Complete booking

**Expected:**
- Points deducted from balance
- Booking appears in dashboard
- Confirmation email sent

### Test 2.3: Back Navigation
**Steps:**
1. Go to `/book-with-points/book/[coachId]`
2. Click "Back to Coaches"

**Expected:**
- Returns to `/book-with-points`

---

## 3. Elite Coaches Page Tests (`/book-elite`)

### Test 3.1: Page Content
**Steps:**
1. Log in as registered user
2. Go to `/book-elite`

**Expected:**
- Shows only elite coaches (is_special = true)
- Shows points balance with "Buy More" button
- Shows "Elite Coach (2-3 points/class)" in legend
- No regular coaches appear

### Test 3.2: Points Display
**Steps:**
1. Check coach cards on `/book-elite`

**Expected:**
- Points badge shows "X pts/class" (not ₦ pricing)
- Uses Coins icon, not currency

### Test 3.3: Booking Flow with Points
**Steps:**
1. Click "Book with Points" on an elite coach
2. Select time slots
3. Complete booking

**Expected:**
- Correct points deducted (2 or 3 points per session)
- Booking appears in dashboard with "Elite" badge
- Back button says "Back to Elite Coaches"

### Test 3.4: Back Navigation
**Steps:**
1. Go to `/book-elite/book/[coachId]`
2. Click "Back to Elite Coaches"

**Expected:**
- Returns to `/book-elite`

### Test 3.5: Insufficient Points
**Steps:**
1. Have less than required points
2. Try to book an elite coach

**Expected:**
- Shows "Insufficient Points" warning
- "Buy Points" button appears
- Cannot complete booking

---

## 4. Special Coaches Page Tests (`/special-coaches`)

### Test 4.1: Guest User Access
**Steps:**
1. Log out (or use incognito)
2. Go to `/special-coaches`

**Expected:**
- Page loads successfully
- Shows ₦ pricing (hourly rate)
- No points balance shown
- "Book Sessions" button (not "Book with Points")

### Test 4.2: Payment Flow
**Steps:**
1. Select sessions
2. Complete booking form
3. Review payment instructions

**Expected:**
- Shows bank transfer details
- Shows WhatsApp link for payment confirmation
- Booking status is "pending_payment"

---

## 5. Conflict Detection Tests (CRITICAL)

### Test 5.1: Point Booking Blocks Special Booking
**Precondition:** Elite coach has availability on Monday 2-3 PM

**Steps:**
1. User A (registered) books Monday 2-3 PM via `/book-elite` (uses points)
2. User B (guest) goes to `/special-coaches/book/[coachId]`
3. Check Monday 2-3 PM slot

**Expected:**
- Monday 2-3 PM shows as "Fully Booked" or unavailable
- Cannot be selected by User B

### Test 5.2: Special Booking Blocks Point Booking
**Precondition:** Elite coach has availability on Tuesday 3-4 PM

**Steps:**
1. User A (guest) books Tuesday 3-4 PM via `/special-coaches`
2. User B (registered) goes to `/book-elite/book/[coachId]`
3. Check Tuesday 3-4 PM slot

**Expected:**
- Tuesday 3-4 PM is not available for selection
- Shows as booked in the calendar

### Test 5.3: Multiple Point Bookings Same Slot
**Steps:**
1. User A books Wednesday 10-11 AM
2. User B tries to book same Wednesday 10-11 AM

**Expected:**
- User B sees slot as unavailable
- Cannot double-book

### Test 5.4: Regular Coach Booking Doesn't Affect Elite
**Steps:**
1. Book a regular coach (non-elite) for Thursday 4-5 PM
2. Check elite coach availability for Thursday 4-5 PM

**Expected:**
- Different coaches - no conflict
- Elite coach slot remains available

---

## 6. Admin Perspective Tests

### Test 6.1: Admin Views All Bookings
**Steps:**
1. Log in as admin
2. Go to admin schedule page

**Expected:**
- Sees all booking types (monthly, points, special)
- Can manage all bookings

### Test 6.2: Admin Creates Point Booking
**Steps:**
1. As admin, book a session for a user

**Expected:**
- Booking created with points system
- Points deducted from user's balance
- All conflict checks work

---

## 7. Edge Cases

### Test 7.1: Direct URL Access to Book-Elite (Logged Out)
**Steps:**
1. Log out
2. Go directly to `/book-elite`

**Expected:**
- Redirects to login page (requires authentication)

### Test 7.2: Direct URL Access to Special Coaches (Logged In)
**Steps:**
1. Log in
2. Go to `/special-coaches`

**Expected:**
- Page loads (allowed for logged-in users too)
- Shows ₦ pricing (not points)

### Test 7.3: Coach Not Found Error
**Steps:**
1. Go to `/book-elite/book/invalid-id`

**Expected:**
- Shows "Coach not found" error
- Back button goes to `/book-elite`

### Test 7.4: Cancelled Bookings Don't Block
**Steps:**
1. Book a slot
2. Cancel the booking
3. Check if slot is available again

**Expected:**
- Cancelled slot becomes available
- Can be re-booked by same or different user

---

## 8. Data Consistency Tests

### Test 8.1: Points Balance Accuracy
**Steps:**
1. Check initial points balance
2. Book elite coach (3 points)
3. Check new balance
4. Cancel booking
5. Check refund

**Expected:**
- Balance updates correctly
- Refund processed correctly

### Test 8.2: Booking Appears in Dashboard
**Steps:**
1. Book via `/book-elite`
2. Go to `/dashboard`

**Expected:**
- Booking appears in "Upcoming" tab
- Shows "Elite" badge
- Shows correct points used

### Test 8.3: Email Notifications
**Steps:**
1. Complete booking

**Expected:**
- Student receives confirmation email
- Coach receives notification email

---

## Test Data Setup

### Coaches to Create (for testing):
1. **Regular Coach**: `is_special = false`, `points_cost = 1`
2. **Elite Coach 1**: `is_special = true`, `points_cost = 2`, `rank_title = "FIDE Master"`
3. **Elite Coach 2**: `is_special = true`, `points_cost = 3`, `rank_title = "International Master"`

### Availability to Set:
- Set identical availability for all coaches to test conflicts
- Example: Mon-Fri 9 AM - 5 PM

### Test Users:
1. **Registered User A**: With sufficient points (10+)
2. **Registered User B**: With 0 points
3. **Guest User**: No login
4. **Admin User**: Full access

---

## Quick Smoke Test Checklist

- [ ] Dashboard → Book a Class → shows only regular coaches
- [ ] Dashboard → Elite Coaches → shows only elite coaches with points
- [ ] `/book-with-points/book/[id]` → back button goes to `/book-with-points`
- [ ] `/book-elite/book/[id]` → back button goes to `/book-elite`
- [ ] Point booking blocks special booking on same slot
- [ ] Special booking blocks point booking on same slot
- [ ] Regular coach bookings don't affect elite coach slots
- [ ] Guest can still book via `/special-coaches` with ₦ pricing
- [ ] Cancelled bookings free up slots
- [ ] Points balance updates correctly

---

## Notes
- Test in both desktop and mobile views
- Test with slow network to check loading states
- Clear browser cache between tests if needed
- Check browser console for any errors
