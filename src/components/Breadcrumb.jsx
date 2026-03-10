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

export default function Breadcrumb() {
  const pathname = usePathname()
  
  // Debug
  console.log('[Breadcrumb] pathname:', pathname)
  
  // Don't show on home page
  if (!pathname || pathname === '/') {
    console.log('[Breadcrumb] Hiding - home page')
    return null
  }
  
  // Split pathname
  const segments = pathname.split('/').filter(Boolean)
  console.log('[Breadcrumb] segments:', segments)
  
  if (segments.length === 0) return null
  
  // Build breadcrumbs
  const breadcrumbs = []
  let currentPath = ''
  
  segments.forEach((segment, index) => {
    // Skip UUIDs and IDs (they're long strings)
    if (segment.length > 20) {
      const parent = segments[index - 1]
      if (parent === 'book') {
        breadcrumbs.push({ label: 'Booking', path: currentPath + '/' + segment, isLast: index === segments.length - 1 })
      } else if (parent === 'book-elite' || parent === 'book-with-points') {
        breadcrumbs.push({ label: 'Book', path: currentPath + '/' + segment, isLast: index === segments.length - 1 })
      } else if (parent === 'special-coaches') {
        breadcrumbs.push({ label: 'Book Session', path: currentPath + '/' + segment, isLast: index === segments.length - 1 })
      }
      currentPath += '/' + segment
      return
    }
    
    currentPath += '/' + segment
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    
    breadcrumbs.push({
      label,
      path: currentPath,
      isLast: index === segments.length - 1
    })
  })
  
  console.log('[Breadcrumb] breadcrumbs:', breadcrumbs)
  
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center flex-wrap gap-1 text-sm">
            {/* Home */}
            <li>
              <Link 
                href="/" 
                className="flex items-center text-[#5E5044] hover:text-[#3d332a] transition-colors font-medium"
              >
                <Home className="w-4 h-4 mr-1" />
                <span>Home</span>
              </Link>
            </li>
            
            {/* Separator and items */}
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.path} className="flex items-center">
                <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
                {crumb.isLast ? (
                  <span className="text-gray-800 font-semibold">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.path}
                    className="text-[#5E5044] hover:text-[#3d332a] hover:underline font-medium"
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
