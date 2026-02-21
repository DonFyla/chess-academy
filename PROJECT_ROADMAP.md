# Chess Academy - Project Roadmap & User Workflow

**Last Updated:** 2026-02-17
**Branch:** kimi/schedule

---

## 👤 USER WORKFLOW

### 1. Discovery Phase
```
Landing Page → Browse Courses (/courses) → View Course Details (/beginner, /intermediate, /expert)
     ↓
See Tutor List with "Book Coach" buttons
```

### 2. Booking Phase
```
Click "Book Coach" → /book (Coaches List) → Select Coach → /book/[coachId]
                                                            ↓
                                                 Calendar View
                                                    ↓
                                         Select Available Date
                                                    ↓
                                         Select Time Slot
                                                    ↓
                                         Fill Student Form (Name, Email, Phone)
                                                    ↓
                                         Submit Booking Request
                                                    ↓
                                         Receive Confirmation Email
```

### 3. Post-Booking
```
Student: Receives email with WhatsApp payment link
           ↓
Admin: Sees booking in /admin/schedule (Pending)
           ↓
Admin: Confirms/Rejects booking
           ↓
Student: Receives confirmation/rejection email
           ↓
Coach: Sees booking in /coach/availability
```

### 4. Coach Workflow
```
Coach Login → /coach/availability → Add Weekly Schedule
                                          ↓
                                   View Upcoming Bookings
                                          ↓
                                   Manage Availability
```

---

## 🔧 DEVELOPMENT TASKS

### Critical (High Priority) - DO FIRST

| # | Issue | Description | Solution | Status |
|---|-------|-------------|----------|--------|
| 1 | **Authentication** | No login/signup pages exist. Anyone can access admin/coach pages | Create auth flow with Supabase Auth | ✅ DONE |
| 2 | **Coach-Specific Booking** | "Book Coach" button goes to generic /book, not specific coach | Pass coachId to pre-select coach in booking form | 🔄 IN PROGRESS |

### Sprint 5: Database Updates (Required for new booking flow) - ✅ DONE
- [x] Run SQL migration: `supabase/migrations/002_update_booking_flow.sql`
- [x] Add coach emails to coaches table (uses auth.users email)
- [x] Test new booking status workflow
- [x] Update admin dashboard for payment confirmation

### Sprint 6: Admin Coach Management - ✅ DONE
- [x] Create `/admin/coaches` page
- [x] View all users and their roles
- [x] Create new coach profiles
- [x] Link users to coach profiles
- [x] Toggle admin status
- [x] Delete coaches
| 3 | **Payment Integration** | Only WhatsApp link - no automated payment | Integrate Paystack/Flutterwave for online payments | ⬜ NOT STARTED |
| 4 | **User Dashboard** | Students can't view their bookings | Create /dashboard page for students | ⬜ NOT STARTED |
| 5 | **Protected Routes** | /admin/schedule and /coach pages aren't protected | Add auth guards | ⬜ NOT STARTED |

### Important (Medium Priority)

| # | Issue | Description | Solution | Status |
|---|-------|-------------|----------|--------|
| 6 | **Coach Profiles** | No individual coach profile pages | Create /coach/[coachId] with bio, ratings, reviews | ⬜ NOT STARTED |
| 7 | **Real-time Updates** | Calendar doesn't update when availability changes | Add Supabase real-time subscriptions | ⬜ NOT STARTED |
| 8 | **Mobile Responsiveness** | Need to verify all pages work on mobile | Test and fix mobile layouts | ⬜ NOT STARTED |
| 9 | **Loading States** | No loading indicators during API calls | Add skeleton screens/spinners | ⬜ NOT STARTED |
| 10 | **Error Handling** | Generic error messages, no fallback UI | Add proper error boundaries and messages | ⬜ NOT STARTED |

### Nice to Have (Low Priority)

| # | Issue | Description | Solution | Status |
|---|-------|-------------|----------|--------|
| 11 | **Reviews/Ratings** | Students can't rate coaches after sessions | Add review system | ⬜ NOT STARTED |
| 12 | **Notifications** | No in-app notifications, only email | Add toast notifications for updates | ⬜ NOT STARTED |
| 13 | **Calendar Sync** | Bookings don't sync to Google/Apple Calendar | Add ICS file generation | ⬜ NOT STARTED |
| 14 | **Group Bookings** | Only 1-on-1 sessions supported | Add group class feature | ⬜ NOT STARTED |
| 15 | **Analytics** | No tracking of conversions/bookings | Add Google Analytics or Mixpanel | ⬜ NOT STARTED |

---

## 📅 RECOMMENDED DEVELOPMENT SPRINTS

### Sprint 1: Authentication & Security (Week 1)
- [ ] Create `/login` page
- [ ] Create `/signup` page
- [ ] Set up Supabase Auth
- [ ] Protect `/admin/*` routes
- [ ] Protect `/coach/*` routes
- [ ] Link coaches to user accounts (user_id in coaches table)

### Sprint 2: Booking Flow Improvements (Week 2)
- [ ] Update "Book Coach" buttons to go directly to `/book?coachId=xxx`
- [ ] Pre-select coach in booking form if coachId is in URL
- [ ] Create student dashboard at `/dashboard`
- [ ] Show upcoming bookings for students

### Sprint 3: Email & Notifications (Week 3) - ✅ DONE
- [x] Sign up for Resend account
- [x] Get Resend API key
- [ ] Verify domain (themovingtrain.org)
- [x] Add RESEND_API_KEY to .env.local
- [x] Test email sending at /test-email
- [x] Updated email templates for new booking flow
- [x] Add in-app toast notifications (using sonner)

### Sprint 4: Payment Integration (Week 4)
- [ ] Research Paystack vs Flutterwave integration
- [ ] Set up payment flow
- [ ] Add payment status to bookings
- [ ] Update email templates with payment confirmation

### Sprint 4: Polish & Testing (Week 4)
- [ ] Mobile responsiveness testing
- [ ] Add loading skeletons
- [ ] Error boundary implementation
- [ ] End-to-end testing of full booking flow

---

## 🗄️ CURRENT DATABASE SCHEMA

### Tables:
1. **coaches** - Coach profiles
2. **availability_slots** - When coaches are available
3. **bookings** - Student booking requests

### Key Relationships:
- Coaches have many availability_slots
- Coaches have many bookings
- Bookings belong to coaches

---

## 🔐 AUTHENTICATION REQUIREMENTS

### User Types:
1. **Student** - Can book sessions, view their bookings
2. **Coach** - Can set availability, view their bookings
3. **Admin** - Can manage all coaches, all bookings, all availability

### Pages by Role:
| Page | Public | Student | Coach | Admin |
|------|--------|---------|-------|-------|
| / | ✅ | ✅ | ✅ | ✅ |
| /courses | ✅ | ✅ | ✅ | ✅ |
| /book | ✅ | ✅ | ✅ | ✅ |
| /book/[coachId] | ✅ | ✅ | ✅ | ✅ |
| /dashboard | ❌ | ✅ | ❌ | ❌ |
| /coach | ❌ | ❌ | ✅ | ❌ |
| /coach/availability | ❌ | ❌ | ✅ | ❌ |
| /admin/schedule | ❌ | ❌ | ❌ | ✅ |

---

## 📝 NOTES

- Calendar alignment and disabled days styling: ✅ DONE
- Book Coach buttons on course pages: ✅ DONE
- Authentication system (login/signup): ✅ DONE
- Email system with Resend: ✅ DONE
- New booking flow with payment confirmation: ✅ DONE
- Branch: `kimi/schedule` - commit changes regularly
- Supabase project needs to be set up for production

## 🆕 NEW BOOKING FLOW (Implemented)

### Student Journey:
1. Student books session → Status: `pending_payment`
2. Student receives email: "Complete payment within 24 hours"
3. Coach receives email: "New booking request"
4. Student pays via WhatsApp
5. Admin confirms payment in dashboard
6. Student receives email: "Booking confirmed!"
7. Coach receives email: "Booking confirmed, student has paid"

### Admin Dashboard Updates:
- "Awaiting Payment" tab shows bookings pending payment
- "Confirm Payment" button to mark payment received
- Sends confirmation emails to both student and coach

### How Users Become Coaches:
1. User signs up at `/signup` → Creates student account
2. Admin goes to `/admin/coaches`
3. Click "Create Coach" → Enter coach details
4. Select user to link from dropdown
5. User can now log in as that coach

### Database Changes Required:
```sql
-- Run this in Supabase SQL Editor:
-- File: supabase/migrations/002_update_booking_flow.sql
```

---

## 🚀 DEPLOYMENT CHECKLIST

Before going live:
- [ ] Set up production Supabase project
- [ ] Configure environment variables
- [ ] Set up Resend for emails
- [ ] Test all user flows
- [ ] Mobile testing complete
- [ ] Performance optimization
- [ ] SEO meta tags
- [ ] Google Analytics
