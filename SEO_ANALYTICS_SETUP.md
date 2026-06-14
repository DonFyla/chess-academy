# SEO & Google Analytics Setup Guide

## ✅ What's Been Added

### 1. SEO Meta Tags

**File:** `src/lib/metadata.js`

Contains optimized metadata for:
- Homepage
- All course pages (beginner, intermediate, expert)
- Booking pages
- Quiz and tutor pages
- Admin pages (no-index for SEO)

**Features:**
- ✅ Title templates
- ✅ Meta descriptions
- ✅ Open Graph tags (for WhatsApp/Facebook sharing)
- ✅ Twitter Card tags
- ✅ Keywords for search engines
- ✅ Robots configuration
- ✅ Canonical URLs

### 2. Google Analytics

**File:** `src/components/GoogleAnalytics.jsx`

**Features:**
- ✅ Automatic page view tracking
- ✅ Custom event tracking helper
- ✅ Pre-defined events for:
  - Booking started/submitted/confirmed
  - User sign up/login
  - Course views
  - Quiz completion
  - Coach profile views

## 🚀 Setup Instructions

### Step 1: Set Up Google Analytics

1. Go to [Google Analytics](https://analytics.google.com)
2. Create a new property for your website
3. Select "Web" as the platform
4. Enter your website URL: `https://www.themovingtrain.org`
5. Copy the **Measurement ID** (looks like `G-XXXXXXXXXX`)

### Step 2: Add Environment Variable

Add to your `.env.local`:
```bash
NEXT_PUBLIC_GA_ID=G-YOUR_ACTUAL_ID_HERE
```

Or add to Vercel/Netlify environment variables.

### Step 3: Verify It's Working

1. Deploy your site
2. Visit your website
3. Check Google Analytics Real-Time report (should show 1 active user)

## 📊 Tracking Custom Events

Use the events helper in your components:

```javascript
import { events } from '@/components/GoogleAnalytics'

// When user starts booking
events.bookingStarted('Coach Name')

// When booking is submitted
events.bookingSubmitted(40000)

// When user views a course
events.courseViewed('Beginner Chess')

// When quiz is completed
events.quizCompleted(85)
```

## 🔍 SEO Checklist

Before launch, verify:

- [ ] Google Analytics is receiving data
- [ ] Meta titles are showing correctly in browser tabs
- [ ] Open Graph image is set (create a 1200x630px image named `og-image.jpg`)
- [ ] Submit sitemap to Google Search Console
- [ ] Test sharing on WhatsApp (should show preview)

## 📈 Key Metrics to Track

In Google Analytics, watch these metrics:

| Metric | Why It Matters |
|--------|----------------|
| Users | How many people visit |
| Bookings Started | Interest in your service |
| Bookings Confirmed | Actual revenue |
| Top Pages | Which coaches/courses are popular |
| Traffic Sources | Where visitors come from |

## 🛠️ Troubleshooting

### Google Analytics not showing data?
1. Check that `NEXT_PUBLIC_GA_ID` is set correctly
2. Make sure it's not `G-XXXXXXXXXX` (the placeholder)
3. Check browser console for errors
4. Verify in GA Real-Time report

### Meta tags not showing?
1. Use "View Page Source" in browser
2. Check that metadata is in the HTML `<head>`
3. Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) to test

## 📝 Next Steps

1. **Create Open Graph Image**
   - Size: 1200x630 pixels
   - Name: `og-image.jpg`
   - Location: `public/og-image.jpg`
   - Shows when sharing on WhatsApp/Facebook

2. **Generate Sitemap** (optional)
   ```bash
   npm install next-sitemap
   # Add to next.config.js
   ```

3. **Submit to Google Search Console**
   - Verify domain ownership
   - Submit sitemap
   - Monitor indexing status

## 💡 Pro Tips

1. **Track WhatsApp clicks** as conversions in GA
2. **Set up goals** for booking confirmations
3. **Monitor mobile vs desktop** usage
4. **Track coach popularity** by profile views

---

**Need help?** Check Google Analytics Help or Next.js documentation.
