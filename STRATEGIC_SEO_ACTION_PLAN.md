# Strategic SEO Action Plan - Moving Train Chess Academy

**Document Purpose:** This is a living document tracking all SEO efforts for themovingtrain.org. Any AI assistant reading this should understand the complete SEO state and next actions.

**Last Updated:** February 2025  
**Current Branch:** `seo-analytics`  
**Target Keywords:** "chess academy Nigeria", "online chess lessons Nigeria", "chess coaching Lagos", "FIDE master Nigeria"

---

## ✅ PHASE 0: COMPLETED (Infrastructure)

### Technical SEO Implemented
| Task | Status | File/Location |
|------|--------|---------------|
| Meta tags for all pages | ✅ Done | `src/lib/metadata.js` |
| Google Analytics 4 | ✅ Done | `src/components/GoogleAnalytics.jsx` - ID: G-E40RGTR97D |
| Sitemap.xml | ✅ Done | `src/app/sitemap.js` - Auto-generates at build time |
| Robots.txt | ✅ Done | `src/app/robots.js` - Blocks admin pages from indexing |
| Open Graph tags | ✅ Done | All pages have OG metadata |
| Canonical URLs | ✅ Done | In layout.js |
| Mobile responsive | ✅ Done | Already implemented |
| SSL (HTTPS) | ✅ Verify | Should be enabled on Vercel |

### GA4 Events Tracked
- `bookingStarted(coachName)`
- `bookingSubmitted(amount)`
- `bookingConfirmed(amount)`
- `userSignup()`
- `userLogin()`
- `courseViewed(courseName)`
- `quizCompleted(score)`
- `coachProfileViewed(coachName)`

**Note:** To use tracking, import `events` from GoogleAnalytics component and call in user actions.

---

## 🎯 PHASE 1: QUICK WINS (This Week - High Impact)

### 1.1 Google Business Profile (CRITICAL - 30 min)
**Why:** This gets you on Google Maps for "chess academy near me" searches

**Steps:**
1. Go to https://business.google.com
2. Click "Add your business to Google"
3. Enter details:
   - Business name: "Moving Train Chess Academy"
   - Category: "Chess Club" (primary), "Educational Institution" (secondary)
   - Address: [Your physical address OR select "I deliver goods and services to my customers" and set service area to "Lagos, Nigeria"]
   - Phone: [Your business phone]
   - Website: https://www.themovingtrain.org
   - Hours: Set your operating hours
4. Verify (Google will send postcard or call)
5. Add photos:
   - Logo
   - Cover image (chess board/students)
   - Photos of coaches teaching
   - Photos of students playing
   - Interior/exterior of location
6. Write description with keywords: "Moving Train Chess Academy offers online chess lessons for kids in Nigeria. Learn from FIDE Masters..."

**Success Metric:** Show up on Google Maps when searching "chess academy Lagos"

---

### 1.2 Get Google Reviews (CRITICAL - Ongoing)
**Why:** Reviews are a ranking factor for local SEO

**Action:**
- Ask EVERY parent to leave a Google review
- Send them direct review link (get this from Google Business Profile)
- Target: 10 reviews in first month, 50 in 6 months
- Respond to every review

**Script for parents:**
"Hi [Name], thank you for trusting us with [Child]'s chess education! Would you mind leaving us a quick review on Google? It helps other parents find us. [Link]"

---

### 1.3 Set Up Google Search Console (30 min)
**Why:** See what keywords you're ranking for

**Steps:**
1. Go to https://search.google.com/search-console
2. Click "Add Property" → Domain
3. Enter: `themovingtrain.org`
4. Verify ownership (via DNS or HTML tag)
5. Submit sitemap: `https://www.themovingtrain.org/sitemap.xml`
6. Wait 24-48 hours for data to appear

**What to Monitor:**
- Total clicks from Google
- Average position for keywords
- Which pages get most traffic
- Any crawl errors

---

### 1.4 Create Blog Content Hub (This Week - 3 hours)
**Why:** Blog posts rank for long-tail keywords and establish authority

**Create Directory:**
```
mkdir -p src/app/blog
```

**Create These Blog Posts (in order of priority):**

#### POST #1: "Top 10 Chess Academies in Nigeria (2026)"
**Target Keyword:** "best chess academy Nigeria", "top chess academies Nigeria"
**URL:** `/blog/top-chess-academies-nigeria`
**Why:** This captures the EXACT search intent of people comparing academies

**Structure:**
```markdown
# Top 10 Chess Academies in Nigeria (2026)

Introduction: Chess is growing in Nigeria... parents looking for best options...

## 1. Moving Train Chess Academy (Lagos)
- Founded: [Year]
- Specialty: Online chess lessons for kids
- Coaches: FIDE Masters, National Masters
- Unique: Personalized coaching, flexible scheduling
- Website: https://www.themovingtrain.org

## 2. [Other Academy]
[Include 8-9 other real academies - be honest]

## How to Choose the Right Chess Academy
- Check coach credentials
- Look for student testimonials
- Consider online vs in-person
- Ask about tournament participation

## Conclusion
Moving Train Chess Academy stands out for...
```

**Note:** Include Moving Train as #1 or #2. Being honest builds trust. Link to your site from this post.

#### POST #2: "How to Choose a Chess Academy for Your Child in Nigeria"
**Target Keyword:** "chess classes for kids Nigeria"
**URL:** `/blog/choose-chess-academy-nigeria`

#### POST #3: "Benefits of Chess for Nigerian Students: Academic & Mental Growth"
**Target Keyword:** "benefits of chess for children"
**URL:** `/blog/benefits-chess-nigerian-students`

---

### 1.5 Nairaland Thread (1 hour)
**Why:** Nairaland threads often rank on Google for Nigeria-specific queries

**Action:**
1. Create account on https://nairaland.com
2. Start thread in "Education" or "Parenting" section:
   - Title: "Review: Moving Train Chess Academy - Online Chess Lessons for Kids"
3. Write genuine review from a parent's perspective
4. Include link to website
5. Update periodically with progress/achievements

---

## 📈 PHASE 2: CONTENT MARKETING (This Month)

### 2.1 Start YouTube Channel
**Why:** YouTube videos rank on Google; parents search "how to learn chess" etc.

**Channel Name:** "Moving Train Chess Academy" or "Chess Coach Nigeria"

**First 5 Videos:**
1. "How Chess Improves Children's Grades (Science Explained)" - 10 mins
2. "Free Chess Lesson: How to Set Up the Board" - 5 mins
3. "Interview with FIDE Master [Coach Name]" - 15 mins
4. "Top 5 Chess Openings for Beginners" - 10 mins
5. "Day in the Life: Online Chess Class" - 5 mins

**SEO for YouTube:**
- Include keywords in title, description, tags
- Link to website in description
- Use custom thumbnail with text overlay

---

### 2.2 Social Media Consistency
**Platforms:** Instagram, TikTok, Facebook

**Content Calendar (3x per week):**
- Monday: Student success story/testimonial
- Wednesday: Chess tip/lesson snippet
- Friday: Behind-the-scenes (coach teaching)

**Hashtags:** #ChessNigeria #ChessAcademyLagos #LearnChess #ChessForKids #FIDE #NigeriaChess

---

## 🔗 PHASE 3: BACKLINK BUILDING (Ongoing - High Priority)

### 3.1 Nigerian Directories (Do This Week)
Submit your business to:
- [ ] https://www.vconnect.com (Nigeria's largest business directory)
- [ ] https://businesslist.com.ng
- [ ] https://www.nigeriagalleria.com
- [ ] https://www.hotfrog.com.ng
- [ ] https://www.enigeria.com

**Submission Format:**
- Name: Moving Train Chess Academy
- Category: Education / Sports
- Description: Include keywords "online chess lessons", "FIDE masters", "Nigeria"
- Website: https://www.themovingtrain.org

---

### 3.2 Guest Posts (This Month)
Reach out to these Nigerian blogs for guest posting:

**Target Blogs:**
- Mummy blogs (parenting blogs with education sections)
- School websites (offer to write "Benefits of chess for students")
- Education blogs

**Email Template:**
```
Subject: Guest Post Idea - "How Chess Improves Academic Performance in Nigerian Students"

Hi [Name],

I came across [Blog Name] and loved your article on [specific post]. 

I'm [Your Name], founder of Moving Train Chess Academy - we provide online chess lessons for kids in Nigeria. I'd love to contribute a guest post about how chess improves academic performance, backed by research.

The post would be 800-1000 words, original, and include a link back to our website.

Would you be interested?

Best,
[Your Name]
Moving Train Chess Academy
https://www.themovingtrain.org
```

---

### 3.3 Partnerships with Schools
**Action:**
- Contact 10 private schools in Lagos
- Offer: "Free chess workshop for your students"
- In exchange: Get listed on their website as "Chess Program Partner"
- This creates high-quality .edu backlinks

---

### 3.4 Nigeria Chess Federation
**Action:**
- Join Nigeria Chess Federation
- Get listed on their website
- Participate in tournaments
- Sponsor a junior tournament (gets press coverage)

---

### 3.5 Press Coverage
**Pitch to Nigerian Media:**
- Punch Nigeria
- Vanguard
- Guardian Nigeria
- The Nation
- Channels TV

**Story Angles:**
- "Local Chess Academy Produces National Champions"
- "How Online Chess is Booming Among Nigerian Kids"
- "Meet the FIDE Master Teaching Chess to Lagos Kids"

**Press Release Format:** Send to features@punchng.com, etc.

---

## 📝 PHASE 4: ONGOING CONTENT (Monthly)

### Blog Post Ideas (Publish 2x per month)
1. "Chess Tournaments in Nigeria 2026: Complete Calendar"
2. "Interview with Nigeria's Youngest Chess Champion"
3. "How to Prepare for Chess Tournaments: Tips from a FIDE Master"
4. "Chess vs. Other Extracurriculars: Which is Best for Your Child?"
5. "The History of Chess in Nigeria"
6. "Common Chess Mistakes Beginners Make (And How to Fix Them)"
7. "Online vs. In-Person Chess Lessons: Pros and Cons"
8. "How to Spot a Good Chess Coach"

**SEO Checklist for Each Post:**
- [ ] Target keyword in title
- [ ] Target keyword in first paragraph
- [ ] Target keyword in H2 heading
- [ ] 800+ words
- [ ] Include internal links (link to other pages on your site)
- [ ] Include external links (to credible sources)
- [ ] Add images with alt text
- [ ] Meta description written
- [ ] URL is short and includes keyword

---

## 📊 TRACKING & METRICS

### Tools to Use
1. **Google Analytics 4** - Already set up
   - Monitor: Users, sessions, bounce rate, conversions
   
2. **Google Search Console** - Set up in Phase 1
   - Monitor: Search queries, impressions, clicks, average position
   
3. **Google Business Profile Insights**
   - Monitor: Profile views, direction requests, phone calls

### Monthly Review Questions
- [ ] How many organic visitors this month?
- [ ] Which keywords are driving traffic?
- [ ] What's our average position for "chess academy Nigeria"?
- [ ] How many new backlinks acquired?
- [ ] How many Google reviews?

### Success Milestones
| Timeline | Target |
|----------|--------|
| 1 month | 10 Google reviews, Search Console set up |
| 3 months | Rank on page 1 for "Moving Train Chess", 5 blog posts published |
| 6 months | Rank on page 1 for "chess academy Nigeria", 20+ backlinks |
| 12 months | Rank #1-3 for target keywords, 1000+ monthly organic visitors |

---

## 🚨 CRITICAL NOTES FOR FUTURE AI ASSISTANTS

### Current Technical State
- Next.js 15 app router
- GA4 ID: G-E40RGTR97D
- All pages have metadata exports
- Sitemap auto-generates at build time
- Admin pages are noindex

### If Something Breaks
1. Check if `NEXT_PUBLIC_GA_ID` is set in Vercel env vars
2. Verify sitemap is generating: `https://www.themovingtrain.org/sitemap.xml`
3. Check robots.txt: `https://www.themovingtrain.org/robots.txt`
4. Use `npm run build` locally to catch build errors

### Adding New Pages
Every new public page MUST:
1. Export metadata from `src/lib/metadata.js`
2. Be added to `sitemap.js` if it's a static page
3. Have proper title and description

Example:
```javascript
import { someMetadata } from "@/lib/metadata";

export const metadata = someMetadata;

export default function NewPage() { ... }
```

### Adding Blog Posts
1. Create folder: `src/app/blog/post-name/page.jsx`
2. Use static export (no "use client")
3. Export metadata with target keywords
4. Add to sitemap.js if not dynamic
5. Link from other pages (internal linking)

---

## 📞 CONTACTS & ACCOUNTS

**Google Analytics:**
- Property: Moving Train Chess Academy
- ID: G-E40RGTR97D

**Google Business Profile:**
- [SET UP REQUIRED - Phase 1.1]

**Search Console:**
- [SET UP REQUIRED - Phase 1.3]

**Social Accounts:**
- Instagram: [@handle - FILL IN]
- Facebook: [FILL IN]
- TikTok: [FILL IN]
- YouTube: [CREATE - Phase 2.1]

---

## NEXT IMMEDIATE ACTION

**If reading this fresh, do these in order:**

1. ✅ Merge and deploy `seo-analytics` branch
2. 🎯 Set up Google Business Profile (Phase 1.1)
3. 🎯 Set up Google Search Console (Phase 1.3)
4. 🎯 Submit sitemap
5. 🎯 Start asking for reviews
6. 🎯 Write "Top 10 Chess Academies" blog post

---

**End of Document**
