# Special Coaches Feature

**Branch:** `special-coaches`
**Purpose:** Premium per-session booking with Nigeria's top-ranked chess coaches

---

## Overview

The Special Coaches feature allows students to book one-on-one sessions with elite coaches (FIDE Masters, National Champions, etc.) on a per-session basis, rather than monthly packages.

## Key Features

### 1. Elite Coach Showcase (`/special-coaches`)
- Displays high-ranked coaches with ranking badges (#1, #2, #3 in Nigeria)
- Shows achievements, hourly rates, and special bios
- Visual distinction for top 3 coaches (gold/silver/bronze styling)

### 2. Per-Session Booking (`/special-coaches/book/[coachId]`)
- User selects number of sessions (1+)
- **Two booking modes:**
  - **Individual selection:** Pick specific dates/times from calendar
  - **Recurring mode:** Select days of week,系统自动 schedules for multiple weeks
- Real-time price calculation (sessions × hourly rate)
- Session summary sidebar

### 3. Coach Rankings Display
- Crown icon for #1 coach
- Trophy for #2
- Medal for #3
- Star for others

---

## Database Schema

### Coaches Table (New Columns)
```sql
is_special BOOLEAN DEFAULT FALSE      -- Flag for elite coaches
rank_title TEXT                       -- e.g., "Nigeria's #1", "FIDE Master"
hourly_rate INTEGER                   -- Per session rate in Naira
achievements TEXT[]                   -- Array of achievements
special_bio TEXT                      -- Extended bio for special coaches
featured_order INTEGER                -- Display order (1 = first)
```

### Special Bookings Table (New)
```sql
special_bookings
├── id UUID PRIMARY KEY
├── coach_id UUID → coaches.id
├── student_id UUID → auth.users.id
├── student_name TEXT
├── student_email TEXT
├── student_phone TEXT
├── total_sessions INTEGER            -- Number of sessions booked
├── sessions_completed INTEGER DEFAULT 0
├── session_dates JSONB               -- Array of {date, start_time, end_time, day_of_week}
├── is_recurring BOOLEAN
├── recurring_days INTEGER[]          -- Days of week [1,3] for Mon, Wed
├── recurring_weeks INTEGER
├── hourly_rate INTEGER
├── total_amount INTEGER
├── status (pending_payment | payment_received | confirmed | completed | cancelled)
└── payment details...
```

---

## How to Add a Special Coach

### Step 1: Update Coach Record
```sql
UPDATE coaches
SET 
  is_special = true,
  rank_title = 'Nigeria\'s #1 Chess Player',
  hourly_rate = 25000,
  achievements = ARRAY[
    'FIDE Master (FM)',
    'National Champion 2025',
    'Chess Olympiad Team Member'
  ],
  special_bio = 'International Master with 15+ years coaching experience...',
  featured_order = 1
WHERE id = 'coach-uuid-here';
```

### Step 2: Set Availability
Use the existing `/coach/availability` page to set their schedule.

---

## Pages & Components

| Path | Component | Purpose |
|------|-----------|---------|
| `/special-coaches` | `SpecialCoachesClient` | List all elite coaches |
| `/special-coaches/book/[coachId]` | `SpecialBookingClient` | Book per-session |

### Key Components in SpecialBookingClient

1. **SessionScheduler** - Calendar interface for picking dates
   - Recurring mode toggle
   - Day-of-week selector
   - Visual calendar grid
   - Selected sessions summary

2. **Booking Summary Sidebar**
   - Session count
   - Rate per session
   - Selected dates list
   - Total amount

---

## Hooks

### useSpecialCoaches
```javascript
const { data: coaches } = useSpecialCoaches()
// Returns coaches where is_special = true, ordered by featured_order
```

### useCreateSpecialBooking
```javascript
const createBooking = useCreateSpecialBooking()
createBooking.mutate({
  coach_id: '...',
  student_name: '...',
  total_sessions: 8,
  session_dates: [{date: '2026-03-01', start_time: '10:00', ...}],
  is_recurring: true,
  recurring_days: [1, 3],  // Monday, Wednesday
  hourly_rate: 25000,
  total_amount: 200000,
  ...
})
```

---

## User Flow

1. User visits `/book` (regular coaches)
2. Sees "Elite Coaching" banner at top
3. Clicks "View Elite Coaches" → `/special-coaches`
4. Browses ranked coaches with achievements
5. Clicks "Book Sessions" on desired coach
6. On booking page:
   - Selects number of sessions
   - Chooses recurring or individual mode
   - Picks dates/times
   - Fills contact info
   - Reviews summary
   - Proceeds to payment

---

## Payment Flow (To Be Implemented)

Current status: Bookings are created with `status: 'pending_payment'`

Next steps:
1. Create payment page for special bookings
2. Generate bank transfer details
3. Admin confirms payment → status: 'confirmed'
4. Send confirmation email with meeting links

---

## Styling

- Gold/yellow for #1 rank
- Silver/gray for #2
- Bronze/amber for #3
- Brown/beige theme (#5E5044) consistent with main site
- Cards with hover effects
- Sticky sidebar for booking summary

---

## SEO

- Metadata for `/special-coaches`: "Elite Chess Coaches | FIDE Masters & National Champions"
- Dynamic metadata for booking pages includes coach name and rank
- Keywords: "FIDE master Nigeria", "elite chess coach", "chess grandmaster lessons"

---

## Future Enhancements

1. **Discount tiers:** 10% off for 8+ sessions, 15% for 12+
2. **Package deals:** Bundle with tournament preparation
3. **Video intro:** Coaches can upload introduction videos
4. **Ratings/Reviews:** Students rate sessions
5. **Waitlist:** If coach is fully booked
6. **Group sessions:** Small group (2-4) special coaching

---

## Testing Checklist

- [ ] Special coaches list displays correctly
- [ ] Rank badges show for top 3
- [ ] Hourly rates display correctly
- [ ] Session count can be adjusted
- [ ] Recurring mode works
- [ ] Individual date selection works
- [ ] Total calculates correctly
- [ ] Form validates required fields
- [ ] Booking creates successfully
- [ ] Link from /book page works
