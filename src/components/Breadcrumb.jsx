'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

// Define breadcrumb labels for routes
const routeLabels = {
  'book': 'Book a Coach',
  'book-elite': 'Elite Coaches',
  'book-with-points': 'Book with Points',
  'special-coaches': 'Special Coaches',
  'dashboard': 'Dashboard',
  'admin': 'Admin',
  'coach': 'Coach Portal',
  'buy-points': 'Buy Points',
  'courses': 'Courses',
  'beginner': 'Beginner Course',
  'intermediate': 'Intermediate Course',
  'expert': 'Expert Course',
  'tutors': 'Our Tutors',
  'gallery': 'Gallery',
  'quiz': 'Chess Quiz',
  'login': 'Login',
  'signup': 'Sign Up',
  'availability': 'Availability',
  'classes': 'Classes',
  'coaches': 'Coaches',
  'points': 'Points',
  'schedule': 'Schedule',
}

// Routes that don't have their own page (parent-only routes)
const nonClickableParents = ['admin', 'coach']

export default function Breadcrumb() {
  const pathname = usePathname()
  
  // Don't show on home page
  if (!pathname || pathname === '/') {
    return null
  }
  
  const segments = pathname.split('/').filter(Boolean)
  
  if (segments.length === 0) return null
  
  const breadcrumbs = []
  let currentPath = ''
  
  segments.forEach((segment, index) => {
    // Skip UUIDs and IDs
    if (segment.length > 20) {
      const parent = segments[index - 1]
      let label = 'Details'
      if (parent === 'book') label = 'Booking'
      else if (parent === 'book-elite' || parent === 'book-with-points') label = 'Book'
      else if (parent === 'special-coaches') label = 'Book Session'
      
      currentPath += '/' + segment
      breadcrumbs.push({ label, path: currentPath, isLast: index === segments.length - 1, clickable: false })
      return
    }
    
    currentPath += '/' + segment
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    
    // Check if this segment is a parent-only route (not clickable)
    const isParentOnly = nonClickableParents.includes(segment) && index < segments.length - 1
    
    breadcrumbs.push({
      label,
      path: currentPath,
      isLast: index === segments.length - 1,
      clickable: !isParentOnly
    })
  })
  
  return (
    <div 
      className="w-full sticky top-[100px] z-[600]"
      style={{ 
        backgroundColor: '#5E5044', 
        borderBottom: '2px solid #D4A574'
      }}
    >
      <div className="container mx-auto px-4 py-3">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center flex-wrap gap-1 text-sm">
            {/* Home */}
            <li>
              <Link 
                href="/" 
                className="flex items-center text-white hover:text-yellow-300 transition-colors font-semibold"
              >
                <Home className="w-4 h-4 mr-1" />
                <span>Home</span>
              </Link>
            </li>
            
            {/* Items */}
            {breadcrumbs.map((crumb) => (
              <li key={crumb.path} className="flex items-center">
                <ChevronRight className="w-4 h-4 text-yellow-300 mx-1" />
                {crumb.isLast || !crumb.clickable ? (
                  <span className={crumb.isLast ? "text-yellow-300 font-bold" : "text-gray-300 font-medium"}>
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.path}
                    className="text-white hover:text-yellow-300 hover:underline font-medium"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  )
}
