# Migration Plan: Next.js + Supabase → Django + Templates + Docker

**Date:** 2026-06-14  
**Status:** In planning — Phase 0 complete (decision made)  
**Branch:** `main`  
**Owner:** Khalil / Moving Train Chess Academy

---

## 1. Decision Summary

We are migrating the Chess Academy webapp from the current stack:

- **Frontend:** Next.js 16 (App Router) + Tailwind CSS + Framer Motion
- **Backend/Auth/DB:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Quiz API:** Django on Railway
- **Payments:** Paystack
- **Email:** Resend
- **Hosting:** Vercel (frontend, free) + Railway (Django backend, ~$5/mo) + Supabase (free tier)

To the target stack:

- **Framework:** Django monolith with server-side templates
- **Frontend:** Django templates + Tailwind CSS + HTMX (for interactive parts)
- **Database:** PostgreSQL
- **Caching/Rate Limiting:** Redis
- **Payments:** Paystack (server-side verification)
- **Email:** Django `send_mail` or Resend API
- **Hosting:** Single VPS with Docker Compose
- **CI/CD:** GitHub Actions → SSH deploy to VPS
- **Target monthly cost:** ~$4–6

**Why:** The current Next.js + Supabase stack introduced avoidable security and complexity issues (client-side admin auth, open email APIs, RLS policy maze, 50+ migrations). Django gives us server-side security by default, a unified codebase, and aligns with the team’s existing expertise.

---

## 2. Hosting & GitHub Deployment

### VPS Choice

Recommended providers:

| Provider | Plan | Approx. Cost | Notes |
|---|---|---|---|
| **Hetzner** | CX11 | ~€3.79/mo (~$4.20) | Cheapest, reliable |
| **DigitalOcean** | Basic Droplet | ~$5–6/mo | Simple, good docs |
| **Linode** | 1GB Nanode | $5/mo | Good support |

### Deployment Flow

Code is pushed to GitHub. GitHub Actions SSHs into the VPS and runs the deploy script:

```
Push to GitHub main
        ↓
GitHub Actions workflow starts
        ↓
SSH into VPS
        ↓
cd /var/www/chess-academy
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose exec web python manage.py migrate
docker compose exec web python manage.py collectstatic --noinput
```

This gives us "push-to-deploy" without needing Vercel or Railway.

---

## 3. Project Structure (Target)

```
chess-academy-django/
├── app/                    # Django project config
├── web/                    # Public marketing pages
├── accounts/               # Custom user model + auth
├── quiz/                   # Quiz system (moved from Railway Django)
├── scheduling/             # Coaches, availability, bookings
├── payments/               # Paystack + points system
├── templates/              # Django HTML templates
├── static/                 # CSS, JS, images
├── docker/
│   ├── Dockerfile
│   └── entrypoint.sh
├── docker-compose.yml
├── docker-compose.prod.yml
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions deploy pipeline
├── .env.example
├── requirements.txt
└── manage.py
```

---

## 4. Phased Migration Plan

### Phase 0: Decision & Prep (1–2 days) ✅

- [x] Decision made to migrate to Django monolith
- [ ] Confirm domain/DNS provider
- [ ] Choose VPS provider
- [ ] Audit current Supabase schema and data
- [ ] Set up new repo or branch for Django monolith

### Phase 1: Django Skeleton + Docker + VPS (1 week)

- [ ] Create Django project with apps: `web`, `accounts`, `quiz`, `scheduling`, `payments`
- [ ] Dockerize: `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`
- [ ] Add services: `web`, `postgres`, `redis`, `nginx`
- [ ] Add GitHub Actions deploy workflow
- [ ] Provision VPS and point staging subdomain to it
- [ ] Deploy skeleton and verify "Hello Django" loads

### Phase 2: Move Quiz System (1 week)

- [ ] Migrate existing Django quiz API from Railway into the monolith
- [ ] Preserve existing API endpoints
- [ ] Migrate quiz models and data
- [ ] Deploy and verify quiz works on VPS

### Phase 3: Postgres Schema Migration (1–2 weeks)

- [ ] Export Supabase schema (`coaches`, `availability_slots`, `bookings`, `flexible_bookings`, `special_coaches`, `special_bookings`, `user_points`, `point_transactions`, etc.)
- [ ] Recreate schema as Django models + migrations
- [ ] Replace Supabase RPCs/triggers with Django ORM logic where simpler
- [ ] Write data migration command to move existing data from Supabase
- [ ] Validate data integrity after migration

### Phase 4: Auth Migration (1 week)

- [ ] Create custom Django `User` model
- [ ] Migrate users from Supabase Auth to Django
- [ ] Replace Supabase client-side auth with Django sessions
- [ ] Implement login, signup, password reset flows
- [ ] Set up admin/coach role checks

### Phase 5: Public Marketing Site (2 weeks)

- [ ] Rebuild public pages in Django templates:
  - [ ] Home page (`/`)
  - [ ] Courses (`/courses`, `/beginner`, `/intermediate`, `/expert`)
  - [ ] Tutors (`/tutors`)
  - [ ] Gallery (`/gallery`)
- [ ] Reuse existing Tailwind CSS, images, fonts
- [ ] Preserve SEO metadata and sitemap
- [ ] Keep quiz page functional (port React quiz UI or embed)

### Phase 6: Booking, Scheduling & Payments (3–4 weeks)

- [ ] Build Django models: Coach, AvailabilitySlot, Booking, FlexibleBooking, SpecialCoach, SpecialBooking, UserPoints, PointTransaction
- [ ] Build public booking flows:
  - [ ] Coach listing
  - [ ] Booking form
  - [ ] Points-based booking
  - [ ] Special coaches booking
  - [ ] Buy points
- [ ] Build coach portal:
  - [ ] Availability management
  - [ ] My bookings
- [ ] Integrate Paystack server-side:
  - [ ] Initialize payment
  - [ ] Verify transaction
  - [ ] Webhook handler
- [ ] Send email notifications via Django or Resend
- [ ] Fix known bugs from current system:
  - [ ] Atomic points updates (no read-modify-write races)
  - [ ] Server-side slot availability check before booking
  - [ ] Confirm booking/points after successful Paystack payment
  - [ ] Blocked dates respected

### Phase 7: Admin Dashboards (1–2 weeks)

- [ ] Configure Django admin for coaches, classes, bookings, points, transactions
- [ ] Build custom admin views where Django admin is insufficient:
  - [ ] Schedule overview
  - [ ] Points approval/confirmation
  - [ ] Booking approval/rejection
- [ ] Replace client-side admin mutations with server-side forms

### Phase 8: Cutover & Go-Live (1 week)

- [ ] Set up production environment on VPS
- [ ] Final data migration from Supabase
- [ ] Point domain `themovingtrain.org` to VPS
- [ ] Set up SSL with Let’s Encrypt
- [ ] Set up automated Postgres backups
- [ ] Monitor for 1–2 weeks
- [ ] Decommission Vercel frontend
- [ ] Decommission Supabase project (after backup)
- [ ] Cancel Railway backend (quiz API)

### Phase 9: Cleanup & Optimization

- [ ] Remove old Next.js code and Supabase migrations
- [ ] Set up error monitoring (Sentry)
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Document deployment and rollback procedures

---

## 5. Estimated Timeline & Cost

| Phase | Estimated Time | Cost Impact |
|---|---|---|
| Phase 0: Decision & Prep | 1–2 days | None |
| Phase 1: Skeleton + Docker + VPS | 1 week | VPS starts (~$4–6/mo) |
| Phase 2: Quiz migration | 1 week | None |
| Phase 3: Schema + data migration | 1–2 weeks | None |
| Phase 4: Auth migration | 1 week | None |
| Phase 5: Public site | 2 weeks | None |
| Phase 6: Booking/payments | 3–4 weeks | None |
| Phase 7: Admin dashboards | 1–2 weeks | None |
| Phase 8: Cutover | 1 week | Cancel Vercel/Railway/Supabase |
| Phase 9: Cleanup | Ongoing | None |

**Total timeline:** ~3–4 months part-time, or 6–8 weeks full-time.  
**Monthly hosting after migration:** ~$4–6 for VPS (Django + Postgres + Redis + Nginx in Docker).

---

## 6. Current Status

- Branch: `main`
- Homepage mission statement updated and pushed to `main`
- Next step: begin Phase 1 — create Django monolith skeleton with Docker and GitHub Actions deploy pipeline

---

## 7. Notes for Future Sessions

- Always work on the Django migration in a dedicated branch (e.g., `django-migration`) until cutover.
- Do not delete the current Next.js/Supabase code until Phase 8 is complete and the Django site is stable.
- Keep Supabase project active during migration as the source of truth for scheduling/booking data.
- The quiz system already exists in Django on Railway — port it first to prove the hosting model.
