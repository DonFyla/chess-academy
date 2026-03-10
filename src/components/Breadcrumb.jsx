'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

// Define breadcrumb labels for routes
const routeLabels = {
  '': 'Home',
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
  'points': 'Points Management',
  'schedule': 'Schedule',
}

export default function Breadcrumb() {
  const pathname = usePathname()
  
  // Don't show breadcrumb on home page
  if (pathname === '/') return null
  
  // Split pathname into segments
  const segments = pathname.split('/').filter(Boolean)
  
  // Build breadcrumb items
  const breadcrumbs = []
  let currentPath = ''
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    
    // Skip dynamic segments like [id] - they'll be handled by the parent
    if (segment.startsWith('[') || segment.length > 30) {
      // Check if it looks like a UUID or ID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
      const isCoachId = segment.length > 20
      
      if (isUUID || isCoachId) {
        // Use parent context for dynamic routes
        const parentSegment = segments[index - 1]
        if (parentSegment === 'book') {
          breadcrumbs.push({
            label: 'Booking Details',
            path: currentPath,
            isLast: index === segments.length - 1
          })
        } else if (parentSegment === 'book-elite' || parentSegment === 'book-with-points') {
          breadcrumbs.push({
            label: 'Book Coach',
            path: currentPath,
            isLast: index === segments.length - 1
          })
        } else if (parentSegment === 'special-coaches') {
          breadcrumbs.push({
            label: 'Book Session',
            path: currentPath,
            isLast: index === segments.length - 1
          })
        }
        return
      }
    }
    
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    
    breadcrumbs.push({
      label,
      path: currentPath,
      isLast: index === segments.length - 1
    })
  })
  
  return (
    <nav className="bg-[#F5EFE7] border-b border-gray-200 py-3 px-4">
      <div className="container mx-auto">
        <ol className="flex items-center flex-wrap gap-2 text-sm">
          {/* Home link */}
          <li>
            <Link 
              href="/" 
              className="flex items-center text-[#5E5044] hover:text-[#4a3f35] transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="sr-only">Home</span>
            </Link>
          </li>
          
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.path} className="flex items-center">
              <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
              {crumb.isLast ? (
                <span className="text-gray-600 font-medium" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className="text-[#5E5044] hover:text-[#4a3f35] hover:underline transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}
