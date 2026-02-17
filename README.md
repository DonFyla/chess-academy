# Chess Academy Frontend

A Next.js 16 React application for the Moving Train Chess Academy - an interactive chess learning platform with an integrated quiz system.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Integration](#api-integration)
- [Quiz System Architecture](#quiz-system-architecture)
- [Development Guide](#development-guide)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Chess Academy frontend is a modern React application that provides:

- **Marketing Website**: Showcase for the chess academy, tutors, courses, and student achievements
- **Interactive Quiz System**: Multi-level chess assessment (Beginner → Intermediate → Expert)
- **Responsive Design**: Mobile-first approach using Tailwind CSS
- **SEO Optimized**: Next.js App Router with metadata configuration

### Live Demo
- **Production**: https://www.themovingtrain.org
- **Backend API**: https://mtrain-backend-production.up.railway.app

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | React framework with App Router |
| React | 18.3.1 | UI library |
| Tailwind CSS | 3.4.1 | Utility-first styling |
| Framer Motion | 11.1.7 | Animations and transitions |
| Embla Carousel | 8.1.6 | Carousel/slider components |
| Lucide React | 0.400.0 | Icon library |
| html-to-image | 1.11.13 | Generate shareable result cards |
| Bun/npm | - | Package manager |

---

## Project Structure

```
chess-academy/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.js             # Home/landing page
│   │   ├── layout.js           # Root layout with SEO metadata
│   │   ├── globals.css         # Global styles + Tailwind
│   │   ├── quiz/page.jsx       # Quiz application
│   │   ├── beginner/page.jsx   # Beginner course
│   │   ├── intermediate/page.jsx # Intermediate course
│   │   ├── expert/page.jsx     # Expert course
│   │   ├── courses/page.jsx    # All courses
│   │   ├── tutors/page.jsx     # Tutors listing
│   │   └── gallery/page.jsx    # Photo gallery
│   │
│   ├── components/
│   │   ├── home/               # Homepage sections
│   │   │   ├── Header.jsx      # Hero section
│   │   │   ├── About-Us.jsx    # About the academy
│   │   │   ├── Courses.jsx     # Course offerings
│   │   │   ├── Tutors.jsx      # Meet the tutors
│   │   │   ├── Events.jsx      # Student achievements
│   │   │   ├── Testimonial.jsx # Parent/student reviews
│   │   │   └── Quiz.jsx        # Main quiz component
│   │   │
│   │   ├── cards/              # Reusable card components
│   │   │   ├── QtakerCard.jsx      # Registration form
│   │   │   ├── QuestionCard.jsx    # Question display
│   │   │   ├── AnswerCard.jsx      # Answer feedback
│   │   │   ├── CourseCard.jsx      # Course preview cards
│   │   │   └── TutorCard.jsx       # Tutor profile cards
│   │   │
│   │   ├── hooks/
│   │   │   └── useQuiz.js      # Quiz state management hook
│   │   │
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.jsx
│   │   │   └── carousel.jsx
│   │   │
│   │   ├── Navbar.jsx          # Navigation
│   │   └── Footer.jsx          # Footer component
│   │
│   ├── lib/
│   │   ├── api.js              # API client & endpoints
│   │   └── utils.js            # Helper functions
│   │
│   └── data.js                 # Static content (tutors, testimonials, etc.)
│
├── public/                     # Static assets
│   └── images/                 # Photos and graphics
│
├── .env                        # Environment variables
├── next.config.mjs             # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.0+
- Backend API running (see [backend setup](../backend/README.md))

### Installation

1. **Navigate to the project:**
   ```bash
   cd chess-academy
   ```

2. **Install dependencies:**
   ```bash
   # Using npm
   npm install

   # Or using Bun (recommended)
   bun install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run development server:**
   ```bash
   # Using npm
   npm run dev

   # Or using Bun
   bun dev
   ```

5. **Open in browser:**
   ```
   http://localhost:3000
   ```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/questionnaire/api

# For production, use:
# NEXT_PUBLIC_API_URL=https://mtrain-backend-production.up.railway.app/questionnaire/api
```

> **Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

---

## API Integration

The frontend communicates with the Django REST API for the quiz system.

### API Client (`src/lib/api.js`)

The `apiClient` handles all HTTP requests with:
- Automatic JSON parsing
- Error handling with status codes
- Network error detection

### Quiz API Endpoints

| Function | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| `createQtaker()` | `/qtaker/` | POST | Create new quiz participant |
| `getQuestion()` | `/quiz/{qtaker_id}/{question_id}/` | GET | Fetch question |
| `submitAnswer()` | `/quiz/{qtaker_id}/{question_id}/` | POST | Submit answer |
| `getAnswerDetails()` | `/answer/{qtaker_id}/{answer_id}/` | GET | Get scoring details |
| `getResults()` | `/result/{qtaker_id}/` | GET | Final results |

### Request/Response Flow

```
1. User Registration
   POST /qtaker/
   Body: { name, email, age, skill }
   Response: { qtaker_id, question_id, skill }

2. Get Question
   GET /quiz/{qtaker_id}/{question_id}/
   Response: { question: { id, text, options, question_type } }

3. Submit Answer
   POST /quiz/{qtaker_id}/{question_id}/
   Body: { answer: option_id | text_answer }
   Response: { is_correct, last_answer_id, next_question_id }

4. Get Answer Details
   GET /answer/{qtaker_id}/{answer_id}/
   Response: { score, correct_answer, explanation }

5. Get Results
   GET /result/{qtaker_id}/
   Response: { score, percentage, passed, next_skill }
```

---

## Quiz System Architecture

### State Management

The quiz uses a custom React hook (`useQuiz.js`) with the following state:

```javascript
{
  currentView: 'registration' | 'question' | 'answer' | 'result',
  qtaker: { id, name, skill, email },
  currentQuestion: { id, text, options, question_type },
  answerData: { is_correct, score, next_question, next_skill },
  score: number,
  loading: boolean,
  error: string | null
}
```

### Quiz Flow

```
┌─────────────────┐
│  Registration   │ User enters name, email, age, skill
│   (QtakerCard)  │
└────────┬────────┘
         │ POST /qtaker/
         ▼
┌─────────────────┐
│    Question     │ Display question (radio or text type)
│ (QuestionCard)  │
└────────┬────────┘
         │ User submits answer
         ▼
┌─────────────────┐
│     Answer      │ Show correct/incorrect with explanation
│  (AnswerCard)   │
└────────┬────────┘
         │ Click "Next"
         ▼
    ┌────────┐
    │ More   │──Yes──► Next Question
    │Questions?
    └────┬───┘
         │ No
         ▼
┌─────────────────┐
│     Result      │ Show final score, pass/fail status
│                 │ Option to retry or proceed to next level
└─────────────────┘
```

### Question Types

1. **Radio (Multiple Choice)**
   - User selects from predefined options
   - Answer is the option ID (number)

2. **Text (Free Response)**
   - User types answer in text field
   - Answer is a string
   - Case-insensitive comparison on backend

---

## Development Guide

### Adding a New Page

1. Create a new folder in `src/app/`:
   ```bash
   mkdir src/app/new-page
   ```

2. Create `page.jsx`:
   ```jsx
   export default function NewPage() {
     return <div>Content</div>;
   }
   ```

3. Access at `http://localhost:3000/new-page`

### Adding Static Content

Edit `src/data.js` to add:
- Tutors to `tutors` array
- Testimonials to `testimonials` array
- Events to `events` array
- Courses to `courses` array

### Styling with Tailwind

Use Tailwind utility classes:
```jsx
<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
  <h1 className="text-3xl font-bold text-blue-600">Title</h1>
</div>
```

### Adding API Endpoints

Add new functions to `src/lib/api.js`:
```javascript
export const quizAPI = {
  // Existing functions...
  
  // New function
  newEndpoint(data) {
    return apiClient.post('/new-endpoint/', data);
  },
};
```

---

## Deployment

### Static Export (Recommended)

The app is configured for static export:

```javascript
// next.config.mjs
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
};
```

**Build for production:**
```bash
npm run build
# Output in ./dist folder
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy to Netlify

```bash
# Build the project
npm run build

# Deploy dist folder
netlify deploy --prod --dir=dist
```

### Environment Setup for Production

1. Set environment variables in hosting platform:
   ```
   NEXT_PUBLIC_API_URL=https://your-production-api.com/questionnaire/api
   ```

2. Ensure CORS is configured on the backend for your frontend domain.

---

## Troubleshooting

### Common Issues

#### 1. API Connection Errors

**Error**: `Unable to connect to server`

**Solutions**:
- Check backend is running: `python manage.py runserver` (port 8000)
- Verify `NEXT_PUBLIC_API_URL` in `.env`
- Check CORS settings on backend

#### 2. CORS Errors

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution**: Add frontend URL to Django CORS settings:
```python
# backend/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://your-production-domain.com",
]
```

#### 3. Images Not Loading

**Error**: `Image optimization failed`

**Solution**: Static export requires unoptimized images:
```javascript
// next.config.mjs
images: {
  unoptimized: true,
}
```

#### 4. Build Errors

**Error**: `Module not found`

**Solution**: 
```bash
rm -rf node_modules .next
npm install
```

### Debug Mode

Enable verbose logging:
```javascript
// In browser console
localStorage.setItem('debug', 'true');
```

---

## Related Documentation

- [Backend API Documentation](../backend/API_DOCUMENTATION.md)
- [Backend Developer Guide](../backend/DEVELOPER_GUIDE.md)
- [Backend Testing Guide](../backend/TESTING.md)

---

## Contributing

1. Create a feature branch: `git checkout -b feature-name`
2. Make changes and test locally
3. Run linting: `npm run lint`
4. Commit with descriptive messages
5. Push and create a Pull Request

---

## License

© 2024 Moving Train Chess Academy. All rights reserved.

---

## Support

For issues or questions:
- Backend issues: Check [backend documentation](../backend/)
- Frontend issues: Create an issue in this repository
- General inquiries: contact@themovingtrain.org
