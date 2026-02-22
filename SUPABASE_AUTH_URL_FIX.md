# Fix Supabase Auth Redirect URL (localhost → Production)

## Problem
When users sign up, the verification email contains a link to `http://localhost:3000` instead of your production domain.

## Solution

You need to configure the **Site URL** and **Redirect URLs** in your Supabase project settings.

---

## Step-by-Step Fix

### 1. Go to Supabase Dashboard

Visit: https://app.supabase.com

Select your project: `edzugxvyhcgsjfnqknek`

---

### 2. Navigate to Auth Settings

1. Click **"Authentication"** in the left sidebar
2. Click **"URL Configuration"** (under Configuration)

---

### 3. Update Site URL

**Site URL** is the main domain of your app:

```
Production: https://www.themovingtrain.org
Or: https://chess-academy.vercel.app (if using Vercel default)
```

Enter your production URL and click **Save**.

---

### 4. Add Redirect URLs

Redirect URLs tell Supabase where to send users after:
- Email verification
- Password reset
- Magic link login

Add these URLs:

```
# Main production URL
https://www.themovingtrain.org/**

# If using Vercel preview deployments
https://*.vercel.app/**

# Local development (keep for testing)
http://localhost:3000/**
```

Click **Save**.

---

## Alternative: Update via SQL

If you have access to Supabase SQL Editor with sufficient permissions:

```sql
-- Update the site URL
-- Note: This requires auth.admin() or similar privileges
-- Usually done through dashboard UI instead
```

**Recommendation**: Use the Dashboard UI method above.

---

## Test the Fix

1. Go to your production site signup page
2. Create a new test account
3. Check the verification email
4. Verify the link now points to your production domain

---

## Additional Configuration

### For Magic Link Emails

If using passwordless/magic link auth, same URLs apply.

### For Password Reset

The reset password email will also use these redirect URLs.

### Custom Email Templates (Optional)

If you want to customize the email content:

1. Go to **Authentication** → **Email Templates**
2. Edit:
   - Confirm signup
   - Magic Link
   - Reset Password
3. Use `{{ .SiteURL }}` variable in templates

Example template variable:
```html
<a href="{{ .SiteURL }}/auth/confirm?token={{ .Token }}">Verify Email</a>
```

---

## Troubleshooting

### Still getting localhost in emails?

1. **Clear cache**: Browser might be caching old config
2. **Check which Supabase project**: Make sure you're editing the production project, not dev
3. **Wait a minute**: Changes can take 30-60 seconds to propagate
4. **Check email template**: If using custom template, ensure `{{ .SiteURL }}` is used

### Multiple environments (dev/staging/prod)?

Add all URLs to the redirect list:
```
http://localhost:3000/**
https://staging.themovingtrain.org/**
https://www.themovingtrain.org/**
```

Or use separate Supabase projects for each environment.

---

## Quick Reference

| Setting | Value | Location |
|---------|-------|----------|
| Site URL | `https://www.themovingtrain.org` | Auth → URL Configuration |
| Redirect URLs | `https://www.themovingtrain.org/**` | Auth → URL Configuration |
| Additional URLs | `http://localhost:3000/**` | Auth → URL Configuration |

---

## Related Files in Your Code

Your auth flow uses these files:
- `src/app/signup/page.jsx` - Sign up form
- `src/app/login/page.jsx` - Login form
- `src/contexts/AuthContext.jsx` - Auth logic

No code changes needed - just Supabase dashboard configuration!
