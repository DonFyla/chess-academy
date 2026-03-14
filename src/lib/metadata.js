// SEO Metadata Configuration for Moving Train Chess Academy

export const siteConfig = {
  name: 'Moving Train Chess Academy',
  description: "Nigeria's leading online chess academy for kids. Learn from FIDE Masters and expert coaches. Book online chess lessons today.",
  url: 'https://www.themovingtrain.org',
  ogImage: 'https://www.themovingtrain.org/og-image.jpg',
  links: {
    twitter: 'https://twitter.com/movingtrain',
    facebook: 'https://facebook.com/movingtrain',
    instagram: 'https://instagram.com/movingtrain',
    whatsapp: 'https://wa.link/uj48gk',
  },
}

export const defaultMetadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'chess lessons',
    'online chess',
    'chess academy',
    'chess coaching',
    'learn chess',
    'chess for kids',
    'Nigeria chess',
    'FIDE master',
    'online chess lessons',
    'chess training',
  ],
  authors: [{ name: 'Moving Train Chess Academy' }],
  creator: 'Moving Train Chess Academy',
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: '@movingtrain',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

// Page-specific metadata helpers
export function getCoachBookingMetadata(coachName = 'Coach', specialization = '', bio = '') {
  const title = `Book a Lesson with ${coachName} | Chess Coaching`
  const description = bio || `Book personalized chess lessons with ${coachName}${specialization ? `, ${specialization}` : ''}. Expert coaching at Moving Train Chess Academy.`
  
  return {
    title,
    description,
    keywords: [
      'chess lessons',
      `${coachName} chess coach`,
      'book chess coach',
      'online chess coaching',
      'chess training',
    ],
    openGraph: {
      type: 'website',
      locale: 'en_NG',
      title,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [siteConfig.ogImage],
    },
  }
}

export function getSpecialCoachBookingMetadata(coachName = 'Elite Coach', rankTitle = '', hourlyRate = 15000) {
  const title = `Book ${coachName} | ${rankTitle || 'Elite Chess Coach'}`
  const description = `Book one-on-one sessions with ${coachName}${rankTitle ? `, ${rankTitle}` : ''}. Premium chess coaching at ₦${hourlyRate.toLocaleString()} per session.`
  
  return {
    title,
    description,
    keywords: [
      'elite chess coach',
      'FIDE master Nigeria',
      'chess grandmaster lessons',
      'premium chess coaching',
      `${coachName} chess`,
      'best chess coach Nigeria',
    ],
    openGraph: {
      type: 'website',
      locale: 'en_NG',
      title,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [siteConfig.ogImage],
    },
  }
}

export function getPointsBookingMetadata(coachName = 'Coach', isSpecial = false, pointsCost = 1, rankTitle = '') {
  const title = `Book with Points | ${coachName}`
  const description = `Use your points to book flexible classes with ${coachName}${isSpecial ? `, ${rankTitle || 'Elite Coach'}` : ''}. ${pointsCost} point${pointsCost > 1 ? 's' : ''} per class.`
  
  return {
    title,
    description,
    keywords: [
      'book chess with points',
      'flexible chess classes',
      'pay per class chess',
      `${coachName} booking`,
      'chess points system',
    ],
    openGraph: {
      type: 'website',
      locale: 'en_NG',
      title,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [siteConfig.ogImage],
    },
  }
}

// Page-specific metadata
export const pageMetadata = {
  home: {
    title: 'Online Chess Lessons for Kids | Expert Coaching',
    description: "Book online chess lessons with Nigeria's best FIDE Masters. Personalized coaching for beginners to advanced players.",
  },
  book: {
    title: 'Book Chess Lessons',
    description: 'Schedule your chess lessons with our expert coaches. Choose your preferred time and start learning today.',
  },
  courses: {
    title: 'Chess Courses',
    description: 'Explore our chess courses from beginner to expert level. Structured learning path for all ages.',
  },
  beginner: {
    title: 'Beginner Chess Course',
    description: 'Start your chess journey with our beginner course. Learn the basics and fundamental strategies.',
  },
  intermediate: {
    title: 'Intermediate Chess Course',
    description: 'Take your chess skills to the next level. Advanced tactics and positional play.',
  },
  expert: {
    title: 'Expert Chess Course',
    description: 'Master chess with advanced training from FIDE Masters. Tournament preparation and strategy.',
  },
  tutors: {
    title: 'Our Chess Coaches',
    description: 'Meet our team of FIDE Masters and expert chess coaches. Learn from the best in Nigeria.',
  },
  quiz: {
    title: 'Chess Skill Assessment',
    description: 'Test your chess knowledge with our skill assessment quiz. Find your perfect starting level.',
  },
  login: {
    title: 'Login',
    description: 'Sign in to your Moving Train Chess Academy account.',
  },
  signup: {
    title: 'Sign Up',
    description: 'Create your Moving Train Chess Academy account and start learning chess today.',
  },
  admin: {
    title: 'Admin Dashboard',
    description: 'Manage bookings, coaches, and schedule for Moving Train Chess Academy.',
    robots: {
      index: false,
      follow: false,
    },
  },
  specialCoaches: {
    title: 'Elite Chess Coaches | FIDE Masters & National Champions',
    description: "Learn from Nigeria's top-ranked chess masters. Book one-on-one sessions with FIDE Masters and National Champions.",
  },
  dashboard: {
    title: 'My Dashboard',
    description: 'View your points balance, bookings, and manage your chess learning journey.',
    robots: {
      index: false,
      follow: false,
    },
  },
  buyPoints: {
    title: 'Buy Points | Flexible Chess Classes',
    description: 'Purchase points to book flexible chess classes. Valid for one year.',
  },
  bookWithPoints: {
    title: 'Book with Points | Flexible Scheduling',
    description: 'Use your points to book chess classes on your schedule. No recurring commitments.',
  },
}


// Helper function to build full metadata from page config
function buildPageMetadata(pageKey) {
  const page = pageMetadata[pageKey]
  const hasRobots = pageKey === 'admin'
  
  return {
    title: page.title,
    description: page.description,
    ...(hasRobots && { robots: page.robots }),
    openGraph: {
      type: 'website',
      locale: 'en_NG',
      title: `${page.title} | ${siteConfig.name}`,
      description: page.description,
      siteName: siteConfig.name,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: page.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${page.title} | ${siteConfig.name}`,
      description: page.description,
      images: [siteConfig.ogImage],
    },
  }
}

// Export page-specific metadata
export const homeMetadata = buildPageMetadata('home')
export const bookMetadata = buildPageMetadata('book')
export const coursesMetadata = buildPageMetadata('courses')
export const beginnerCourseMetadata = buildPageMetadata('beginner')
export const intermediateCourseMetadata = buildPageMetadata('intermediate')
export const expertCourseMetadata = buildPageMetadata('expert')
export const tutorsMetadata = buildPageMetadata('tutors')
export const quizMetadata = buildPageMetadata('quiz')
export const loginMetadata = buildPageMetadata('login')
export const signupMetadata = buildPageMetadata('signup')
export const adminMetadata = buildPageMetadata('admin')

// Gallery uses the same metadata as courses
export const galleryMetadata = buildPageMetadata('courses')

// Special coaches metadata
export const specialCoachesMetadata = buildPageMetadata('specialCoaches')

// Points system metadata
export const dashboardMetadata = buildPageMetadata('dashboard')
export const buyPointsMetadata = buildPageMetadata('buyPoints')
export const bookWithPointsMetadata = buildPageMetadata('bookWithPoints')
