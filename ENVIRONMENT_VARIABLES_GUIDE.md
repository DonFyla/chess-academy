# Environment Variables Guide - Production Deployment

## ⚠️ Critical Security Warning

**NEVER commit `.env.local` to git!** It contains sensitive API keys.

## Current Status

| File | In Git? | Contains Secrets? | Purpose |
|------|---------|-------------------|---------|
| `.env.local` | ❌ No | ✅ Yes | Local development secrets |
| `.env` | ✅ Yes | ❌ No | Only localhost URL |
| `.env.example` | ✅ Yes | ❌ No | Template with placeholders |
| `.env.production` | ✅ Yes | ❌ No | Template for production |

## What Happens If You Push Now?

✅ **Safe to push** - `.env.local` is gitignored  
❌ **Won't work in production** - Production needs env vars configured

## How Production Environment Variables Work

### Local Development
```
.env.local → Used by Next.js dev server
```

### Production (Vercel/Netlify/etc)
```
Hosting Platform Env Vars → Used by production build
```

The production server **does not use `.env.local`**. You must configure env vars in your hosting platform.

---

## Step-by-Step: Configure Production Env Vars

### Option 1: Vercel (Recommended)

#### Method A: Vercel Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Select your project
3. Click **"Settings"** → **"Environment Variables"**
4. Add each variable:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://edzugxvyhcgsjfnqknek.supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Production |
| `RESEND_API_KEY` | `re_jTBWYdq7...` | Production |
| `NEXT_PUBLIC_WHATSAPP_LINK` | `https://wa.link/uj48gk` | Production |

5. Click **"Save"**
6. Redeploy: `git push` or click "Redeploy" in Vercel

#### Method B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Link to project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add RESEND_API_KEY production
vercel env add NEXT_PUBLIC_WHATSAPP_LINK production

# Deploy
vercel --prod
```

---

### Option 2: Netlify

1. Go to https://app.netlify.com
2. Select your site
3. Go to **"Site settings"** → **"Build & deploy"** → **"Environment"**
4. Click **"Edit variables"**
5. Add all variables
6. Save and trigger new deploy

---

### Option 3: Self-Hosted (VPS/Docker)

Create `.env` file on server (not in git):

```bash
# SSH into server
ssh user@your-server.com

# Create .env file
cd /path/to/app
nano .env

# Add variables
NEXT_PUBLIC_SUPABASE_URL=https://edzugxvyhcgsjfnqknek.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
RESEND_API_KEY=re_jTBWYdq7...
NEXT_PUBLIC_WHATSAPP_LINK=https://wa.link/uj48gk

# Save and restart
```

---

## Environment Variable Naming Rules

### Public Variables (Accessible in browser)
- Must start with `NEXT_PUBLIC_`
- Example: `NEXT_PUBLIC_SUPABASE_URL`
- ⚠️ Never put secrets in public variables!

### Private Variables (Server-only)
- No prefix required
- Example: `RESEND_API_KEY`
- Only accessible in API routes and server components

---

## Security Checklist

### Before Pushing to Production

- [ ] `.env.local` is in `.gitignore`
- [ ] No secrets in any committed files
- [ ] All API keys are production keys (not test keys)
- [ ] Supabase project is production project (not dev)
- [ ] Resend domain is verified for production
- [ ] WhatsApp number is correct business number

### Verify No Secrets in Git

```bash
# Search for potential secrets
git log --all --full-history -- .env.local
grep -r "re_" . --include="*.js" --include="*.ts" --include="*.jsx"
grep -r "eyJhb" . --include="*.js" --include="*.ts"
```

---

## Testing Production Environment

### 1. Build Locally with Production Vars

```bash
# Temporarily rename .env.local
cp .env.local .env.local.backup
rm .env.local

# Create production env
cp .env.production .env.local
# Edit .env.local with real production values

# Build
npm run build

# Test
npm start
```

### 2. Test on Vercel Preview

Every push creates a preview deployment:
- Push to any branch
- Vercel creates preview URL
- Test booking flow on preview
- If works, merge to main

---

## Troubleshooting

### "Missing environment variable" error

**Cause**: Variable not set in hosting platform
**Fix**: Add missing env var in Vercel/Netlify dashboard

### "RESEND_API_KEY is not configured" error

**Cause**: `RESEND_API_KEY` not set
**Fix**: Add to environment variables in hosting platform

### "Invalid Supabase credentials"

**Cause**: Using dev Supabase keys in production
**Fix**: Update to production Supabase project keys

---

## Quick Reference: What Goes Where

| Variable | Local (.env.local) | Production (Vercel) | Public? |
|----------|-------------------|---------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | Yes |
| `RESEND_API_KEY` | ✅ | ✅ | No |
| `NEXT_PUBLIC_WHATSAPP_LINK` | ✅ | ✅ | Yes |
| `DATABASE_URL` | ✅ (if used) | ✅ | No |

---

## Summary

✅ **Push is safe** - `.env.local` is gitignored  
⚠️ **Won't work** - You must configure env vars in hosting platform  
📝 **Use `.env.production`** as a template/reference

### Deploy Checklist

1. ✅ Code is ready
2. ✅ `.env.local` is gitignored
3. ⏳ Configure env vars in Vercel/Netlify
4. ⏳ Deploy
5. ⏳ Test booking flow on production

---

*Remember: Environment variables in hosting platform = Production secrets. `.env.local` = Local development secrets. Never mix them!*
